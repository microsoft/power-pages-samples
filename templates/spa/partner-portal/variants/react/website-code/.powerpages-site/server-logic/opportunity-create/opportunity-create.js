// Server Logic: opportunity-create
// Purpose: F-013 partner-created opportunity. msa_partnerid, adx_partnercreated and the status columns are NOT in
//          Webapi/opportunity/fields (SP2), so this endpoint sets them: the caller's partner, partner-created,
//          In Progress. The customer must be a customer account managed by the caller's partner; the partner contact
//          must belong to the caller's partner (sellers can only assign themselves).
//          POST { fields: { name, estimatedvalue, ... , "customerid_account@odata.bind", ... }, partnerContactId }
// API URL: https://<site-url>/_api/serverlogics/opportunity-create

function post() {
  try {
    Server.Logger.Log('opportunity-create POST called');
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
    var bindId = (value, set) => {
      if (typeof value !== 'string') return null;
      var m = new RegExp('^/' + set + '\\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\)$').exec(value || '');
      return m ? m[1] : null;
    };
    var same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
    var deny = message =>
      JSON.stringify({ status: 'error', method: 'POST', message: message || "You don't have permission to do this. Refresh the page and try again." });

    var ALLOWED = [
      'name',
      'estimatedvalue',
      'isrevenuesystemcalculated',
      'estimatedclosedate',
      'purchasetimeframe',
      'description',
      'customerneed',
      'customerid_account@odata.bind',
      'adx_TerritoryId@odata.bind',
    ];

    var input = JSON.parse(Server.Context.Body || '{}');
    if (!input || typeof input !== 'object' || Array.isArray(input) || !input.fields || typeof input.fields !== 'object' || Array.isArray(input.fields))
      return deny('Enter valid opportunity details.');
    var me = one('contacts', Server.User.contactid, 'contactid,statecode,adx_partnercontactrole,_parentcustomerid_value');
    var partnerId = me._parentcustomerid_value;
    if (me.statecode !== 0 || !partnerId || [756150000, 756150001, 756150002].indexOf(me.adx_partnercontactrole) < 0) {
      return deny();
    }

    var payload = {};
    ALLOWED.forEach(k => {
      if (input.fields && Object.keys(input.fields).indexOf(k) >= 0) {
        payload[k] = input.fields[k];
      }
    });
    if (typeof payload.name !== 'string' || !payload.name.trim()) {
      return deny('Enter a topic.');
    }
    payload.name = payload.name.trim();
    if (
      payload.estimatedvalue !== undefined &&
      payload.estimatedvalue !== null &&
      (typeof payload.estimatedvalue !== 'number' || !Number.isFinite(payload.estimatedvalue) || payload.estimatedvalue < 0)
    ) {
      return deny('Enter an estimated revenue of 0 or more.');
    }
    var closeDate = payload.estimatedclosedate;
    if (
      typeof closeDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(closeDate) ||
      !Number.isFinite(Date.parse(closeDate)) ||
      new Date(closeDate.slice(0, 10)).toISOString().slice(0, 10) !== closeDate.slice(0, 10)
    ) {
      return deny('Enter a valid estimated close date.');
    }
    if (
      ['description', 'customerneed'].some(key => payload[key] != null && typeof payload[key] !== 'string') ||
      (payload.isrevenuesystemcalculated !== undefined && typeof payload.isrevenuesystemcalculated !== 'boolean') ||
      (payload.purchasetimeframe != null && (typeof payload.purchasetimeframe !== 'number' || !Number.isInteger(payload.purchasetimeframe)))
    ) {
      return deny('Enter valid opportunity details.');
    }

    var customerId = bindId(payload['customerid_account@odata.bind'], 'accounts');
    if (!customerId) {
      return deny('Choose a valid customer account.');
    }
    var customer = one('accounts', customerId, 'accountid,accountclassificationcode,_msa_managingpartnerid_value');
    if (customer.accountclassificationcode !== 1 || !same(customer._msa_managingpartnerid_value, partnerId) || same(customerId, partnerId)) {
      return deny();
    }
    payload['parentaccountid@odata.bind'] = '/accounts(' + customerId + ')';
    if (payload['adx_TerritoryId@odata.bind'] != null && !bindId(payload['adx_TerritoryId@odata.bind'], 'territories')) {
      return deny('Choose a valid territory.');
    }

    var ownerId = input.partnerContactId || Server.User.contactid;
    if (!isGuid(ownerId)) {
      return deny();
    }
    if (me.adx_partnercontactrole === 756150002 && !same(ownerId, Server.User.contactid)) {
      return deny();
    }
    if (!same(ownerId, Server.User.contactid)) {
      var owner = one('contacts', ownerId, 'contactid,_parentcustomerid_value,statecode');
      if (!same(owner._parentcustomerid_value, partnerId) || owner.statecode !== 0) {
        return deny();
      }
    }

    payload.adx_partnercreated = true;
    payload.adx_partnercollaboration = false;
    payload.statuscode = 1;
    payload['msa_partnerid@odata.bind'] = '/accounts(' + partnerId + ')';
    payload['msa_partneroppid@odata.bind'] = '/contacts(' + ownerId + ')';

    var creationAttempted = true;
    var created = parse(Server.Connector.Dataverse.CreateRecord('opportunities', JSON.stringify(payload)), true);
    var newId = createdId(created, 'opportunityid');
    return JSON.stringify({ status: 'success', id: newId });
  } catch (err) {
    Server.Logger.Error('opportunity-create POST failed: ' + err.message);
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
