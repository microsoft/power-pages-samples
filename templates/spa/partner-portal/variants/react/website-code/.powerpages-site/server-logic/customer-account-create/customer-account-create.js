// Server Logic: customer-account-create
// Purpose: P-008 create customer account. accountclassificationcode and msa_managingpartnerid aren't in
//          Webapi/account/fields (otherwise a partner could reclassify its own account as a customer it manages), so this
//          endpoint creates the account as a customer (classification 1) with only whitelisted columns. C-PROC-004 sets
//          the managing partner from the creating portal contact.
//          POST { fields: { name, accountnumber, telephone1, ... } }
// API URL: https://<site-url>/_api/serverlogics/customer-account-create

function post() {
  try {
    Server.Logger.Log('customer-account-create POST called');
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

    var deny = message =>
      JSON.stringify({ status: 'error', method: 'POST', message: message || "You don't have permission to do this. Refresh the page and try again." });
    var ALLOWED = [
      'name',
      'accountnumber',
      'telephone1',
      'emailaddress1',
      'fax',
      'websiteurl',
      'description',
      'address1_line1',
      'address1_line2',
      'address1_line3',
      'address1_city',
      'address1_stateorprovince',
      'address1_postalcode',
      'address1_country',
    ];

    var input = JSON.parse(Server.Context.Body || '{}');
    if (!input || typeof input !== 'object' || Array.isArray(input) || !input.fields || typeof input.fields !== 'object' || Array.isArray(input.fields))
      return deny('Enter valid account details.');
    var me = one('contacts', Server.User.contactid, '$select=contactid,statecode,adx_partnercontactrole,_parentcustomerid_value');
    if (me.statecode !== 0 || !me._parentcustomerid_value || [756150000, 756150001].indexOf(me.adx_partnercontactrole) < 0) {
      return deny();
    }

    var payload = {};
    ALLOWED.forEach(k => {
      if (input.fields && Object.keys(input.fields).indexOf(k) >= 0) {
        payload[k] = input.fields[k];
      }
    });
    if (Object.values(payload).some(value => value !== null && typeof value !== 'string')) return deny('Account fields must contain text.');
    if (typeof payload.name !== 'string' || !payload.name.trim()) {
      return deny('Enter an account name.');
    }
    payload.name = payload.name.trim();
    payload.accountclassificationcode = 1;
    payload['adx_CreatedByportalcontactId@odata.bind'] = '/contacts(' + Server.User.contactid + ')';

    var creationAttempted = true;
    var created = parse(Server.Connector.Dataverse.CreateRecord('accounts', JSON.stringify(payload)), true);
    var newId = createdId(created, 'accountid');
    return JSON.stringify({ status: 'success', id: newId });
  } catch (err) {
    Server.Logger.Error('customer-account-create POST failed: ' + err.message);
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
