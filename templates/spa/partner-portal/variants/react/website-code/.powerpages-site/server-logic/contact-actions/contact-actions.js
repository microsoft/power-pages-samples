// Server Logic: contact-actions
// Purpose: Validate-and-execute writes for contact columns that are NOT in Webapi/contact/fields, so a direct /_api
//          PATCH can't change them (SP1: self-promotion to Partner Admin, moving a contact to another partner).
//          Every rule is re-checked from Dataverse; nothing about the caller is taken from the request body.
//          POST { action: "setRole", contactid, role }                  Partner Admin; same partner account
//          POST { action: "create", fields, parentAccountId }               partner contact (PA) or customer contact (PA/PM)
//          POST { action: "update", contactid, fields, parentAccountId } customer contacts of the caller's partner
// API URL: https://<site-url>/_api/serverlogics/contact-actions

function post() {
  try {
    Server.Logger.Log('contact-actions POST called');
    if (!Server.User || !Server.User.contactid) throw new Error('Authentication required.');

    var parse = (response, allowEmpty) => {
      var r = typeof response === 'string' ? JSON.parse(response) : response;
      if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('Invalid Dataverse response.');
      var status = r.StatusCode === undefined ? 200 : Number(r.StatusCode);
      if (!Number.isInteger(status) || status < 200 || status >= 300 || r.IsSuccessStatusCode === false || r.ServerError) {
        var failure = new Error('Dataverse request failed (' + status + '): ' + (r.ServerErrorMessage || r.ReasonPhrase || 'Unsuccessful connector response.'));
        failure.status = status;
        throw failure;
      }
      var body = r.Body === undefined ? r : r.Body;
      if (typeof body === 'string') body = body.trim() ? JSON.parse(body) : null;
      if (body == null && allowEmpty === true) body = {};
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid Dataverse response body.');
      if (body.error) throw new Error('Dataverse operation failed: ' + (body.error.message || 'Unknown error.'));
      if (
        allowEmpty === true &&
        r.Body === undefined &&
        r.StatusCode === undefined &&
        r.IsSuccessStatusCode !== true &&
        !body.accountid &&
        !body.contactid &&
        !body.opportunityid
      )
        throw new Error('Unconfirmed Dataverse write.');
      return { body: body, headers: r.Headers || {} };
    };
    var primaryKeys = { accounts: 'accountid', contacts: 'contactid' };

    var one = (set, id, query) => {
      if (query && query.indexOf('$') < 0) query = '$select=' + query;
      var body = parse(Server.Connector.Dataverse.RetrieveRecord(set, id, String(query || '').replace(/^\?/, ''), true)).body;
      if (typeof body[primaryKeys[set]] !== 'string' || !body[primaryKeys[set]]) throw new Error('Dataverse record is missing its id.');
      return body;
    };

    var createdId = (created, key) => {
      var headers = created.headers;
      var values = Object.keys(headers)
        .filter(name => ['entityid', 'odata-entityid', 'location'].indexOf(name.toLowerCase()) >= 0)
        .map(name => headers[name]);
      values.push(created.body[key]);
      for (var value of values) {
        if (typeof value !== 'string') continue;
        var match =
          /^(?:\{)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\})?$/i.exec(value) ||
          /\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)(?:\?.*)?$/i.exec(value);
        if (match) return match[1];
      }
      throw new Error('Create returned no valid record id.');
    };

    var isGuid = v => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v || '');
    var deny = message =>
      JSON.stringify({ status: 'error', method: 'POST', message: message || "You don't have permission to do this. Refresh the page and try again." });
    var ok = extra => {
      var out = { status: 'success' };
      Object.keys(extra || {}).forEach(k => {
        out[k] = extra[k];
      });
      return JSON.stringify(out);
    };

    var ROLE = { admin: 756150000, manager: 756150001, seller: 756150002 };
    var FIELDS = [
      'firstname',
      'lastname',
      'jobtitle',
      'emailaddress1',
      'telephone1',
      'mobilephone',
      'address1_line1',
      'address1_line2',
      'address1_line3',
      'address1_city',
      'address1_stateorprovince',
      'address1_postalcode',
      'address1_country',
      'donotemail',
      'donotphone',
      'donotfax',
      'donotpostalmail',
    ];
    var pick = fields => {
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('Invalid contact fields.');
      var out = {};
      FIELDS.forEach(k => {
        if (fields && Object.keys(fields).indexOf(k) >= 0) {
          out[k] = fields[k];
        }
      });
      if (Object.keys(out).some(key => (key.indexOf('donot') === 0 ? typeof out[key] !== 'boolean' : out[key] !== null && typeof out[key] !== 'string'))) {
        throw new Error('Invalid contact field type.');
      }
      if (Object.hasOwn(out, 'lastname')) {
        if (typeof out.lastname !== 'string' || !out.lastname.trim()) throw new Error('A last name is required.');
        out.lastname = out.lastname.trim();
      }
      return out;
    };

    var input = JSON.parse(Server.Context.Body || '{}');
    if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('Enter valid contact details.');
    var me = one('contacts', Server.User.contactid, 'contactid,statecode,adx_partnercontactrole,_parentcustomerid_value');
    var partnerId = me._parentcustomerid_value;
    var myRole = me.adx_partnercontactrole;
    if (me.statecode !== 0 || !partnerId || [ROLE.admin, ROLE.manager, ROLE.seller].indexOf(myRole) < 0) {
      return deny();
    }
    // GUIDs are compared case-insensitively so a differently-cased id can't slip past an equality check.
    var same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
    var isManagedCustomerAccount = accountId => {
      if (!isGuid(accountId) || same(accountId, partnerId)) {
        return false;
      }
      var a = one('accounts', accountId, 'accountid,accountclassificationcode,_msa_managingpartnerid_value');
      return a.accountclassificationcode === 1 && same(a._msa_managingpartnerid_value, partnerId) && !same(a.accountid, partnerId);
    };

    if (input.action === 'setRole') {
      if (myRole !== ROLE.admin || !isGuid(input.contactid)) {
        return deny();
      }
      if (input.role != null && typeof input.role !== 'number' && typeof input.role !== 'string') return deny('Choose a valid partner role.');
      var role = input.role === null || input.role === '' || input.role === undefined ? null : Number(input.role);
      if (role !== null && [ROLE.admin, ROLE.manager, ROLE.seller].indexOf(role) < 0) {
        return deny('Choose a valid partner role.');
      }
      var target = one('contacts', input.contactid, 'contactid,_parentcustomerid_value');
      if (!same(target._parentcustomerid_value, partnerId)) {
        return deny();
      }
      if (same(input.contactid, Server.User.contactid) && role !== ROLE.admin) {
        return deny("You can't remove your own Partner Admin role. Ask another Partner Admin.");
      }
      parse(Server.Connector.Dataverse.UpdateRecord('contacts', input.contactid, JSON.stringify({ adx_partnercontactrole: role })), true);
      return ok();
    }

    if (input.action === 'create') {
      var payload = pick(input.fields);
      if (!payload.lastname) {
        return deny('Enter a last name.');
      }
      // A contact under the caller's own partner account is a partner contact (Partner Admin only); any other parent
      // must be a customer account managed by the caller's partner (Partner Admin or Manager).
      var parent = input.parentAccountId;
      if (same(parent, partnerId)) {
        if (myRole !== ROLE.admin) {
          return deny();
        }
        parent = partnerId;
      } else if (myRole === ROLE.seller || !isManagedCustomerAccount(parent)) {
        return deny();
      }
      payload['parentcustomerid_account@odata.bind'] = '/accounts(' + parent + ')';
      payload['adx_createdbyportalcontactId@odata.bind'] = '/contacts(' + Server.User.contactid + ')';
      var creationAttempted = true;
      var created = parse(Server.Connector.Dataverse.CreateRecord('contacts', JSON.stringify(payload)), true);
      var newId = createdId(created, 'contactid');
      return ok({ id: newId });
    }

    if (input.action === 'update') {
      if (!isGuid(input.contactid)) {
        return deny();
      }
      var existing = one('contacts', input.contactid, 'contactid,adx_partnercontactrole,_parentcustomerid_value,_msa_managingpartnerid_value');
      // Only customer contacts managed by the caller's partner can move between customer accounts.
      var isCustomerContact = existing.adx_partnercontactrole === null || existing.adx_partnercontactrole === undefined;
      if (!isCustomerContact || !same(existing._msa_managingpartnerid_value, partnerId) || same(existing._parentcustomerid_value, partnerId)) {
        return deny();
      }
      if (!isManagedCustomerAccount(input.parentAccountId)) {
        return deny();
      }
      var changes = pick(input.fields);
      changes['parentcustomerid_account@odata.bind'] = '/accounts(' + input.parentAccountId + ')';
      parse(Server.Connector.Dataverse.UpdateRecord('contacts', input.contactid, JSON.stringify(changes)), true);
      return ok();
    }

    return deny('Unknown request.');
  } catch (err) {
    Server.Logger.Error('contact-actions POST failed: ' + err.message);
    return JSON.stringify({
      status: 'error',
      method: 'POST',
      message:
        typeof creationAttempted !== 'undefined' && creationAttempted
          ? 'Creation could not be confirmed. Check the list before trying again to avoid duplicates.'
          : 'The change could not be saved. Refresh the page and try again.',
    });
  }
}
