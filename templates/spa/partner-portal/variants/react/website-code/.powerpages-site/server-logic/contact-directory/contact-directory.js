// Server Logic: contact-directory
// Purpose: Reads contact columns that are deliberately NOT in Webapi/contact/fields (partner role, parent account,
//          managing partner, application status/date), so the portal Web API can neither read nor write them.
//          Runs in the caller's table-permission context, so every query is still scoped like /_api.
//          ?scope=me         -> the signed-in contact and its parent account (session, profile)
//          ?scope=customers  -> customer contacts managed by the caller's partner (L-003)
//          ?scope=accounts   -> customer accounts managed by the caller's partner (L-002)
//          ?id=<guid>        -> one contact (customer contact form, P-012)
// API URL: https://<site-url>/_api/serverlogics/contact-directory

function get() {
  try {
    Server.Logger.Log('contact-directory GET called');
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

    var isGuid = v => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v || '');

    var CONTACT_SELECT =
      'contactid,firstname,lastname,jobtitle,emailaddress1,telephone1,mobilephone,address1_line1,address1_line2,' +
      'address1_line3,address1_city,address1_stateorprovince,address1_postalcode,address1_country,_parentcustomerid_value,' +
      '_msa_managingpartnerid_value,adx_partnercontactrole,statecode,createdon,donotemail,donotphone,donotfax,donotpostalmail';
    var OWN_SELECT =
      CONTACT_SELECT +
      ',websiteurl,adx_organizationname,adx_partnernumberofemployees,adx_competencies,' +
      'adx_partner_targetmarket,adx_partner_technologies,adx_geo_apac,adx_geo_australia,adx_geo_emea,adx_geo_northamerica,' +
      'adx_geo_southamerica,adx_partner_applicationstatus,adx_partner_applicationdate';
    var ACCOUNT_SELECT =
      'accountid,name,accountnumber,telephone1,emailaddress1,fax,websiteurl,description,address1_line1,' +
      'address1_line2,address1_line3,address1_city,address1_stateorprovince,address1_postalcode,address1_country,' +
      'accountclassificationcode,_primarycontactid_value,_msa_managingpartnerid_value,statecode,createdon';

    var scope = Server.Context.QueryParameters['scope'];
    var id = Server.Context.QueryParameters['id'];

    if (scope === 'me') {
      var me = one('contacts', Server.User.contactid, '$select=' + OWN_SELECT);
      var account = null;
      if (me._parentcustomerid_value) {
        try {
          account = one('accounts', me._parentcustomerid_value, '$select=' + ACCOUNT_SELECT);
        } catch (e) {
          if (e.status !== 403 && e.status !== 404) throw e;
          Server.Logger.Warn('contact-directory parent account unavailable: ' + e.status);
        }
      }
      return JSON.stringify({ status: 'success', me: me, account: account });
    }

    if (scope === 'customers' || scope === 'accounts') {
      var caller = one('contacts', Server.User.contactid, '$select=contactid,_parentcustomerid_value,adx_partnercontactrole');
      var partnerId = caller._parentcustomerid_value;
      // Customer lists belong to the Account Manager (sales) workspace. Partner Technicians and non-partners have no
      // partner contact role, so they never get customer data here even if a table permission were misconfigured.
      if ([756150000, 756150001, 756150002].indexOf(caller.adx_partnercontactrole) < 0) {
        return JSON.stringify({ status: 'error', message: "You don't have permission to view customers." });
      }
      if (!partnerId) {
        return JSON.stringify({ status: 'success', contacts: [], accounts: [] });
      }
      if (scope === 'accounts') {
        // L-002: classification and managing partner aren't Web API fields either (a partner could otherwise
        // reclassify its own account as a customer it manages).
        var accounts = list(
          'accounts',
          '$select=' +
            ACCOUNT_SELECT +
            '&$expand=primarycontactid($select=contactid,firstname,lastname)' +
            '&$filter=' +
            encodeURIComponent('_msa_managingpartnerid_value eq ' + partnerId + ' and accountclassificationcode eq 1') +
            '&$orderby=name',
        );
        return JSON.stringify({ status: 'success', accounts: accounts });
      }
      var contacts = list(
        'contacts',
        '$select=' +
          CONTACT_SELECT +
          '&$expand=parentcustomerid_account($select=accountid,name)' +
          '&$filter=' +
          encodeURIComponent(
            '_msa_managingpartnerid_value eq ' + partnerId + ' and adx_partnercontactrole eq null and _parentcustomerid_value ne ' + partnerId,
          ) +
          '&$orderby=lastname',
      );
      return JSON.stringify({ status: 'success', contacts: contacts });
    }

    if (isGuid(id)) {
      try {
        var contact = one('contacts', id, '$select=' + CONTACT_SELECT + '&$expand=parentcustomerid_account($select=accountid,name)');
        return JSON.stringify({ status: 'success', found: true, contact: contact });
      } catch (e) {
        if (e.status === 404 || e.status === 403) {
          return JSON.stringify({ status: 'success', found: false });
        }
        throw e;
      }
    }

    return JSON.stringify({ status: 'error', method: 'GET', message: 'Unknown request.' });
  } catch (err) {
    Server.Logger.Error('contact-directory GET failed: ' + err.message);
    return JSON.stringify({ status: 'error', method: 'GET', message: 'The requested data could not be loaded completely. Please try again.' });
  }
}
