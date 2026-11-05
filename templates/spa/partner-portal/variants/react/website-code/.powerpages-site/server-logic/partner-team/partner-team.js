// Server Logic: partner-team
// Purpose: One call for Manage access (P-031), Parent account (P-034) and Edit partner contact (P-032).
//          Returns the caller's partner account (+ primary contact), the partner contacts, the latest invitation per
//          contact (adx_invitation is readable here through a Parent-scope permission and is NOT Web API-enabled),
//          and – with ?contactId – that contact's portal comments.
// API URL: https://<site-url>/_api/serverlogics/partner-team?contactId=<guid>

function get() {
  try {
    Server.Logger.Log('partner-team GET called');
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

    // Contact comments inherit permissions through the parent-scoped partner-contact chain. OData reads of such
    // chains fail with a generic Dataverse error for portal users; FetchXML is the documented workaround.
    var fetchAll = (set, entity, attributes, filterXml, orders) => {
      var key = primaryKeys[set];
      if (!key) throw new Error('Unsupported collection.');
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
        var body = parse(Server.Connector.Dataverse.RetrieveMultipleRecords(set, 'fetchXml=' + encodeURIComponent(xml)));
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

    var isGuid = v => {
      return typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v || '');
    };

    var contactId = Server.Context.QueryParameters['contactId'];
    if (contactId && !isGuid(contactId)) return JSON.stringify({ status: 'error', message: 'A valid contact id is required.' });
    var me = one('contacts', Server.User.contactid, '?$select=contactid,_parentcustomerid_value');
    var partnerId = me._parentcustomerid_value;
    if (!partnerId) {
      return JSON.stringify({ status: 'success', account: null, contacts: [], invitations: [] });
    }

    var account = one(
      'accounts',
      partnerId,
      '?$select=accountid,name,accountnumber,telephone1,emailaddress1,fax,websiteurl,description,address1_line1,address1_line2,' +
        'address1_line3,address1_city,address1_stateorprovince,address1_postalcode,address1_country,accountclassificationcode,' +
        '_primarycontactid_value,statecode,createdon',
    );
    var contacts = list(
      'contacts',
      '?$select=contactid,firstname,lastname,jobtitle,emailaddress1,telephone1,mobilephone,address1_line1,address1_line2,' +
        'address1_line3,address1_city,address1_stateorprovince,address1_postalcode,address1_country,adx_partnercontactrole,' +
        '_parentcustomerid_value,_msa_managingpartnerid_value,statecode,createdon&$orderby=lastname' +
        '&$filter=' +
        encodeURIComponent('_parentcustomerid_value eq ' + partnerId),
    );

    // Latest invitation per contact – Partner Admin only (other roles have no invitation permission, and a denied
    // connector call fails the whole endpoint instead of throwing).
    var invitations = [];
    var roles = Server.User.Roles || [];
    if (typeof roles === 'string') roles = roles.trim().charAt(0) === '[' ? JSON.parse(roles) : [roles];
    var isPartnerAdmin = Array.isArray(roles) && roles.indexOf('Partner Admin') >= 0;
    if (isPartnerAdmin && contacts.length > 0) {
      var ors = contacts.map(c => {
        return '_adx_invitecontact_value eq ' + c.contactid;
      });
      for (var i = 0; i < ors.length; i += 20) {
        invitations = invitations.concat(
          list(
            'adx_invitations',
            '?$select=adx_invitationid,statuscode,createdon,_adx_invitecontact_value&$orderby=createdon desc' +
              '&$filter=' +
              encodeURIComponent(ors.slice(i, i + 20).join(' or ')),
          ),
        );
      }
    }

    var result = { status: 'success', account: account, contacts: contacts, invitations: invitations };
    if (contactId) {
      if (!contacts.some(contact => String(contact.contactid).toLowerCase() === contactId.toLowerCase())) {
        return JSON.stringify({ status: 'error', message: 'This contact is not available in your partner team.' });
      }
      result.comments = fetchAll(
        'adx_portalcomments',
        'adx_portalcomment',
        ['activityid', 'description', 'createdon', 'createdby', 'adx_portalcommentdirectioncode'],
        '<filter><condition attribute="regardingobjectid" operator="eq" value="' + contactId + '"/></filter>',
        [['createdon', true]],
      );
    }
    return JSON.stringify(result);
  } catch (err) {
    Server.Logger.Error('partner-team GET failed: ' + err.message);
    return JSON.stringify({ status: 'error', method: 'GET', message: 'The requested data could not be loaded completely. Please try again.' });
  }
}
