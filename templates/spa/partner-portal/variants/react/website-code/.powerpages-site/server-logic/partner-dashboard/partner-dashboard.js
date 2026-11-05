// Server Logic: partner-dashboard
// Purpose: One call for the partner Home dashboard, Opportunities home and Customers home.
//          Returns the caller's permission-scoped opportunities (L-006 ∪ L-008 membership, trimmed columns),
//          their deal registrations and, with sections=counts, customer account/contact counts.
//          Runs as the signed-in contact, so table permissions scope every query exactly like /_api.
// API URL: https://<site-url>/_api/serverlogics/partner-dashboard?sections=rows,counts

function get() {
  try {
    Server.Logger.Log('partner-dashboard GET called');
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
      if (body == null && allowEmpty === true) body = {};
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

    var sectionsParam = Server.Context.QueryParameters['sections'] || 'rows,counts';
    var sections = sectionsParam.split(',');
    if (sections.some(section => ['rows', 'counts'].indexOf(section) < 0)) {
      return JSON.stringify({ status: 'error', message: 'Unknown dashboard section.' });
    }
    var me = one('contacts', Server.User.contactid, '?$select=contactid,_parentcustomerid_value');
    var partnerId = me._parentcustomerid_value || null;
    var result = { status: 'success', partnerId: partnerId };

    if (sections.indexOf('rows') >= 0) {
      var oppFilter =
        '(statuscode eq 100000001 and adx_partnercollaboration ne true)' +
        ' or statuscode eq 100000003 or statuscode eq 3 or statuscode eq 100000004' +
        ' or statuscode eq 4 or statuscode eq 5 or statuscode eq 2' +
        ' or (statuscode eq 1 and adx_partnercreated eq true)';
      result.opportunities = list(
        'opportunities',
        '?$select=opportunityid,name,estimatedvalue,estimatedclosedate,actualclosedate,statecode,statuscode,' +
          'adx_expirydate,adx_partnercreated,adx_partnercollaboration,purchasetimeframe,_customerid_value,' +
          '_msa_partnerid_value,_msa_partneroppid_value,_adx_territoryid_value,createdon,modifiedon' +
          '&$expand=customerid_account($select=accountid,name),adx_TerritoryId($select=territoryid,name)' +
          '&$filter=' +
          encodeURIComponent(oppFilter) +
          '&$orderby=modifiedon desc',
      );
      result.registrations = list(
        'adx_dealregistrationrequests',
        '?$select=adx_dealregistrationrequestid,adx_name,statecode,statuscode,adx_submissiondate,adx_startdate,' +
          'adx_expirationdate,_adx_opportunityid_value,_adx_partner_value,_adx_partnercontact_value' +
          '&$orderby=adx_submissiondate desc',
      );
    }

    if (sections.indexOf('counts') >= 0 && partnerId) {
      var accounts = list(
        'accounts',
        '?$select=accountid,statecode&$filter=' + encodeURIComponent('_msa_managingpartnerid_value eq ' + partnerId + ' and accountclassificationcode eq 1'),
      );
      var contacts = list(
        'contacts',
        '?$select=contactid,statecode&$filter=' +
          encodeURIComponent(
            '_msa_managingpartnerid_value eq ' + partnerId + ' and adx_partnercontactrole eq null and _parentcustomerid_value ne ' + partnerId,
          ),
      );
      result.counts = {
        customerAccounts: accounts.length,
        activeCustomerAccounts: accounts.filter(a => {
          return a.statecode === 0;
        }).length,
        customerContacts: contacts.length,
      };
    }

    return JSON.stringify(result);
  } catch (err) {
    Server.Logger.Error('partner-dashboard GET failed: ' + err.message);
    return JSON.stringify({ status: 'error', method: 'GET', message: 'The requested data could not be loaded completely. Please try again.' });
  }
}
