// Server Logic: customer-account-workspace
// Purpose: One call for Edit customer account (P-009): the account, its primary contact and its contacts (L-018).
//          Out-of-scope ids return { found: false }.
// API URL: https://<site-url>/_api/serverlogics/customer-account-workspace?id=<guid>

function get() {
  try {
    Server.Logger.Log('customer-account-workspace GET called');
    if (!Server.User || !Server.User.contactid) throw new Error('Authentication required.');

    var parse = response => {
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
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid Dataverse response body.');
      if (body.error) throw new Error('Dataverse operation failed: ' + (body.error.message || 'Unknown error.'));
      return body;
    };
    // Single-level expansions always have a navigation URL; only a paging token or the
    // documented 5,000-row ceiling indicates that related data may be incomplete.
    var relatedIncomplete = record =>
      Object.keys(record).some(field => {
        if (field.slice(-15) !== '@odata.nextLink' || !record[field]) return false;
        var related = record[field.slice(0, -15)];
        return typeof record[field] !== 'string' || !Array.isArray(related) || related.length >= 5000 || /[?&](?:\$|%24)skiptoken=/i.test(record[field]);
      });
    var primaryKeys = {
      accounts: 'accountid',
      contacts: 'contactid',
      opportunities: 'opportunityid',
      opportunityproducts: 'opportunityproductid',
      adx_dealregistrationrequests: 'adx_dealregistrationrequestid',
      adx_portalcomments: 'activityid',
      territories: 'territoryid',
      adx_invitations: 'adx_invitationid',
    };

    var one = (set, id, query) => {
      var body = parse(Server.Connector.Dataverse.RetrieveRecord(set, id, String(query || '').replace(/^\?/, '')));
      if (typeof body[primaryKeys[set]] !== 'string' || !body[primaryKeys[set]]) throw new Error('Dataverse record is missing its id.');
      if (relatedIncomplete(body)) throw new Error('Related records are incomplete.');
      return body;
    };

    // Follow the connector's encoded continuation unchanged; never return a first page as a complete list.
    var list = (set, query) => {
      var qs = String(query || '').replace(/^\?/, '');
      var key = primaryKeys[set];
      if (!key) throw new Error('Unsupported collection.');
      if (/(^|&)\$orderby=/.test(qs)) {
        qs = qs.replace(/(^|&)\$orderby=([^&]+)/, (match, prefix, order) => prefix + '$orderby=' + order + ',' + key);
      } else qs += (qs ? '&' : '') + '$orderby=' + key;
      var topMatch = /(?:^|&)\$top=(\d+)(?:&|$)/.exec(qs);
      var top = topMatch ? Number(topMatch[1]) : Infinity;
      var rows = [];
      var seen = new Set();
      for (var page = 0; page < 20; page++) {
        if (seen.has(qs)) throw new Error('Dataverse continuation repeated.');
        seen.add(qs);
        var body = parse(Server.Connector.Dataverse.RetrieveMultipleRecords(set, qs));
        if (
          !Array.isArray(body.value) ||
          body.value.some(row => !row || typeof row !== 'object' || Array.isArray(row) || typeof row[key] !== 'string' || !row[key])
        ) {
          throw new Error('Invalid Dataverse collection.');
        }
        if (body.value.some(relatedIncomplete)) {
          throw new Error('Related records are incomplete.');
        }
        if (rows.length + body.value.length > 10000) throw new Error('The complete collection exceeds the read limit.');
        rows = rows.concat(body.value);
        if (rows.length >= top) return rows.slice(0, top);
        var next = body['@odata.nextLink'];
        if (next === undefined || next === null || next === '') return rows;
        if (typeof next !== 'string') throw new Error('Invalid Dataverse continuation.');
        var separator = next.indexOf('?');
        var path = next.slice(0, separator);
        if (separator < 0 || (path && path.slice(path.lastIndexOf('/') + 1) !== set) || separator === next.length - 1) {
          throw new Error('Invalid Dataverse continuation target.');
        }
        qs = next.slice(separator + 1);
      }
      throw new Error('The complete collection exceeds the page limit.');
    };

    var isGuid = v => {
      return typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v || '');
    };

    var id = Server.Context.QueryParameters['id'];
    if (!isGuid(id)) {
      return JSON.stringify({ status: 'error', method: 'GET', message: 'A valid account id is required.' });
    }
    var account;
    try {
      account = one(
        'accounts',
        id,
        '?$select=accountid,name,accountnumber,telephone1,emailaddress1,fax,websiteurl,description,address1_line1,address1_line2,' +
          'address1_line3,address1_city,address1_stateorprovince,address1_postalcode,address1_country,accountclassificationcode,' +
          '_primarycontactid_value,_msa_managingpartnerid_value,statecode,createdon' +
          '&$expand=primarycontactid($select=contactid,firstname,lastname)',
      );
    } catch (e) {
      if (e.status === 404 || e.status === 403) {
        return JSON.stringify({ status: 'success', found: false });
      }
      throw e;
    }
    var contacts = list(
      'contacts',
      '?$select=contactid,firstname,lastname,jobtitle,emailaddress1,telephone1,mobilephone,address1_line1,address1_line2,' +
        'address1_line3,address1_city,address1_stateorprovince,address1_postalcode,address1_country,adx_partnercontactrole,' +
        '_parentcustomerid_value,_msa_managingpartnerid_value,statecode,createdon&$orderby=lastname' +
        '&$filter=' +
        encodeURIComponent('_parentcustomerid_value eq ' + id),
    );

    return JSON.stringify({ status: 'success', found: true, account: account, contacts: contacts });
  } catch (err) {
    Server.Logger.Error('customer-account-workspace GET failed: ' + err.message);
    return JSON.stringify({ status: 'error', method: 'GET', message: 'The requested data could not be loaded completely. Please try again.' });
  }
}
