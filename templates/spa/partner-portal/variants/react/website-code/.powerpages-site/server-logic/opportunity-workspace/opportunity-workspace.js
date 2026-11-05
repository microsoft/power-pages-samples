// Server Logic: opportunity-workspace
// Purpose: One call for Opportunity summary (P-019), Details (P-023), Details shared (P-022) and Create (P-021 lookups).
//          ?id=<guid>                → opportunity + products + customer contacts + shared partner contacts +
//                                      collaborating partners + deal registrations + portal comments
//          ?id=<guid>&include=lookups → also customer accounts, customer contacts, partner contacts, territories
//          ?mode=create              → lookups only
//          Out-of-scope ids return { found: false } and no field values (REQ-ACT-06).
// API URL: https://<site-url>/_api/serverlogics/opportunity-workspace?id=<guid>

function get() {
  try {
    Server.Logger.Log('opportunity-workspace GET called');
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

    // skipCache: opportunity status changes made through server logic actions (WinOpportunity/LoseOpportunity) don't
    // invalidate the portal's read cache, so a cached read would show the old status after the action.
    var one = (set, id, query) => {
      var body = parse(Server.Connector.Dataverse.RetrieveRecord(set, id, String(query || '').replace(/^\?/, ''), true));
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

    // Products and comments inherit permissions through many-to-many opportunity scopes. OData reads of such
    // multi-level chains fail with a generic Dataverse error for portal users; FetchXML is the documented workaround.
    // Pages by number until Dataverse reports no more records, with the same bounds as list().
    var fetchAll = (set, entity, attributes, filterXml, orders) => {
      var key = primaryKeys[set];
      if (!key) throw new Error('Unsupported collection.');
      // The primary key makes the order total, so page boundaries are stable.
      var orderXml = orders
        .concat([[key, false]])
        .map(o => '<order attribute="' + o[0] + '"' + (o[1] ? ' descending="true"' : '') + '/>')
        .join('');
      var rows = [];
      for (var page = 1; page <= 20; page++) {
        var xml =
          '<fetch page="' + page + '" count="5000"><entity name="' + entity + '">' +
          attributes.map(a => '<attribute name="' + a + '"/>').join('') +
          filterXml +
          orderXml +
          '</entity></fetch>';
        var body = parse(Server.Connector.Dataverse.RetrieveMultipleRecords(set, 'fetchXml=' + encodeURIComponent(xml), true));
        if (
          !Array.isArray(body.value) ||
          body.value.some(row => !row || typeof row !== 'object' || Array.isArray(row) || typeof row[key] !== 'string' || !row[key])
        ) {
          throw new Error('Invalid Dataverse collection.');
        }
        if (rows.length + body.value.length > 10000) throw new Error('The complete collection exceeds the read limit.');
        rows = rows.concat(body.value);
        var more = body['@Microsoft.Dynamics.CRM.morerecords'];
        if (more !== true && more !== 'true') return rows;
        if (body.value.length === 0) throw new Error('Invalid Dataverse continuation.');
      }
      throw new Error('The complete collection exceeds the page limit.');
    };
    var formatted = (row, field) => row[field + '@OData.Community.Display.V1.FormattedValue'];
    var whereEquals = (attribute, id) => '<filter><condition attribute="' + attribute + '" operator="eq" value="' + id + '"/></filter>';

    var isGuid = v => {
      return typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v || '');
    };

    var id = Server.Context.QueryParameters['id'];
    var mode = Server.Context.QueryParameters['mode'] || '';
    var include = Server.Context.QueryParameters['include'] || '';
    if (['', 'create'].indexOf(mode) < 0 || ['', 'lookups'].indexOf(include) < 0) {
      return JSON.stringify({ status: 'error', message: 'Unknown workspace request.' });
    }
    var result = { status: 'success' };

    if (mode !== 'create') {
      if (!isGuid(id)) {
        return JSON.stringify({ status: 'error', method: 'GET', message: 'A valid opportunity id is required.' });
      }
      var opportunity = null;
      try {
        opportunity = one(
          'opportunities',
          id,
          '?$select=opportunityid,name,description,customerneed,estimatedvalue,estimatedclosedate,actualclosedate,actualvalue,' +
            'statecode,statuscode,purchasetimeframe,adx_expirydate,adx_accepteddate,adx_referencecode,adx_partnercreated,' +
            'adx_partnercollaboration,_customerid_value,_parentcontactid_value,_msa_partnerid_value,_msa_partneroppid_value,' +
            '_adx_territoryid_value,_adx_dealregistrationrequestid_value,createdon,modifiedon' +
            '&$expand=customerid_account($select=accountid,name),adx_TerritoryId($select=territoryid,name),' +
            'msa_partnerid($select=accountid,name),msa_partneroppid($select=contactid,firstname,lastname),' +
            'adx_opportunity_account($select=accountid,name),' +
            'adx_partner_collaboration($select=contactid,firstname,lastname,jobtitle,emailaddress1,telephone1,_parentcustomerid_value,createdon),' +
            'adx_internal_collaboration($select=contactid,firstname,lastname,jobtitle,emailaddress1,telephone1,_parentcustomerid_value,createdon)',
        );
      } catch (e) {
        if (e.status === 404 || e.status === 403) {
          return JSON.stringify({ status: 'success', found: false });
        }
        throw e;
      }
      result.found = true;
      result.opportunity = opportunity;
      // Rows keep the OData shape the client maps: product and unit names come from lookup formatted values.
      result.products = fetchAll(
        'opportunityproducts',
        'opportunityproduct',
        ['opportunityproductid', 'productdescription', 'isproductoverridden', 'quantity', 'priceperunit', 'extendedamount', 'productid', 'uomid', 'createdon'],
        whereEquals('opportunityid', id),
        [['createdon', false]],
      ).map(row => {
        var product = row._productid_value ? { productid: row._productid_value, name: formatted(row, '_productid_value') || null } : null;
        var uom = row._uomid_value ? { uomid: row._uomid_value, name: formatted(row, '_uomid_value') || null } : null;
        return Object.assign({}, row, { productid: product, uomid: uom });
      });
      result.registrations = list(
        'adx_dealregistrationrequests',
        '?$select=adx_dealregistrationrequestid,adx_name,statecode,statuscode,adx_submissiondate,adx_startdate,adx_expirationdate,' +
          'adx_reasonforregistering,adx_renewalreason,_adx_opportunityid_value,_adx_partner_value,_adx_partnercontact_value' +
          '&$expand=adx_PartnerContact($select=contactid,firstname,lastname)' +
          '&$filter=' +
          encodeURIComponent('_adx_opportunityid_value eq ' + id) +
          '&$orderby=adx_submissiondate desc',
      );
      result.comments = fetchAll(
        'adx_portalcomments',
        'adx_portalcomment',
        ['activityid', 'description', 'createdon', 'createdby', 'adx_portalcommentdirectioncode'],
        whereEquals('regardingobjectid', id),
        [['createdon', true]],
      );
    }

    if (mode === 'create' || include === 'lookups') {
      var me = one('contacts', Server.User.contactid, '?$select=contactid,_parentcustomerid_value');
      var partnerId = me._parentcustomerid_value;
      result.lookups = { partnerId: partnerId || null, customerAccounts: [], customerContacts: [], partnerContacts: [], territories: [] };
      if (partnerId) {
        result.lookups.customerAccounts = list(
          'accounts',
          '?$select=accountid,name,statecode&$orderby=name' +
            '&$filter=' +
            encodeURIComponent('_msa_managingpartnerid_value eq ' + partnerId + ' and accountclassificationcode eq 1 and statecode eq 0'),
        );
        result.lookups.customerContacts = list(
          'contacts',
          '?$select=contactid,firstname,lastname,jobtitle,emailaddress1,telephone1,_parentcustomerid_value,createdon&$orderby=lastname' +
            '&$filter=' +
            encodeURIComponent(
              '_msa_managingpartnerid_value eq ' +
                partnerId +
                ' and adx_partnercontactrole eq null and _parentcustomerid_value ne ' +
                partnerId +
                ' and statecode eq 0',
            ),
        );
        result.lookups.partnerContacts = list(
          'contacts',
          '?$select=contactid,firstname,lastname,jobtitle,emailaddress1,telephone1,adx_partnercontactrole,_parentcustomerid_value,createdon&$orderby=lastname' +
            '&$filter=' +
            encodeURIComponent('_parentcustomerid_value eq ' + partnerId + ' and statecode eq 0'),
        );
      }
      result.lookups.territories = list('territories', '?$select=territoryid,name&$orderby=name');
    }

    return JSON.stringify(result);
  } catch (err) {
    Server.Logger.Error('opportunity-workspace GET failed: ' + err.message);
    return JSON.stringify({ status: 'error', method: 'GET', message: 'The requested data could not be loaded completely. Please try again.' });
  }
}
