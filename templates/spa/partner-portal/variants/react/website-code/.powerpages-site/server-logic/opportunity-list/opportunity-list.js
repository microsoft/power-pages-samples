// Server Logic: opportunity-list
// Purpose: One call for the Distributed (L-006) and Managed/Collaborative (L-008) lists.
//          Returns permission-scoped opportunity rows with customer, territory, partner, partner contact and
//          collaborating partners joined, plus the deal registrations needed for the "Registration status" column.
// API URL: https://<site-url>/_api/serverlogics/opportunity-list?view=distributed|managed

function get() {
  try {
    Server.Logger.Log('opportunity-list GET called');
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
        // skipCache: status changes from opportunity-action (WinOpportunity/LoseOpportunity) don't invalidate the read cache.
        var body = parse(Server.Connector.Dataverse.RetrieveMultipleRecords(set, qs, true));
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

    var view = Server.Context.QueryParameters['view'] || 'managed';
    var filters = {
      distributed: 'statuscode eq 100000001 and adx_partnercollaboration ne true',
      managed:
        'statuscode eq 100000003 or statuscode eq 3 or statuscode eq 100000004 or statuscode eq 4' +
        ' or statuscode eq 5 or statuscode eq 2 or (statuscode eq 1 and adx_partnercreated eq true)',
    };
    // Object.hasOwn: the server logic validator rejects scripts that reference the inherited-member object model.
    var filter = Object.hasOwn(filters, view) ? filters[view] : null;
    if (!filter) {
      return JSON.stringify({ status: 'error', method: 'GET', message: 'Unknown view: ' + view });
    }

    var opportunities = list(
      'opportunities',
      '?$select=opportunityid,name,description,customerneed,estimatedvalue,estimatedclosedate,actualclosedate,actualvalue,' +
        'statecode,statuscode,purchasetimeframe,adx_expirydate,adx_accepteddate,adx_referencecode,adx_partnercreated,' +
        'adx_partnercollaboration,_customerid_value,_msa_partnerid_value,_msa_partneroppid_value,_adx_territoryid_value,' +
        '_adx_dealregistrationrequestid_value,createdon,modifiedon' +
        '&$expand=customerid_account($select=accountid,name),adx_TerritoryId($select=territoryid,name),' +
        'msa_partnerid($select=accountid,name),msa_partneroppid($select=contactid,firstname,lastname),' +
        'adx_opportunity_account($select=accountid,name)' +
        '&$filter=' +
        encodeURIComponent(filter) +
        '&$orderby=modifiedon desc',
    );

    var registrations = [];
    if (view === 'managed' && opportunities.length > 0) {
      registrations = list(
        'adx_dealregistrationrequests',
        '?$select=adx_dealregistrationrequestid,adx_name,statecode,statuscode,adx_submissiondate,adx_startdate,' +
          'adx_expirationdate,_adx_opportunityid_value,_adx_partner_value,_adx_partnercontact_value' +
          '&$orderby=adx_submissiondate desc',
      );
    }

    return JSON.stringify({ status: 'success', view: view, opportunities: opportunities, registrations: registrations });
  } catch (err) {
    Server.Logger.Error('opportunity-list GET failed: ' + err.message);
    return JSON.stringify({ status: 'error', method: 'GET', message: 'The requested data could not be loaded completely. Please try again.' });
  }
}
