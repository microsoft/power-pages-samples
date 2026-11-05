// Server Logic: global-search
// GET /_api/serverlogics/global-search?q=<text>&types=opp,account,contact,partner&top=20
// All reads run under the caller's table permissions. Metadata and role bindings are unchanged.
function get() {
  var currentStep = 'init';
  try {
    Server.Logger.Log('global-search GET called');
    var debug = String(Server.Context.QueryParameters['debug'] || '') === '1';
    var trace = [];
    var warnings = new Set();
    var CANDIDATE_LIMIT = 500;
    var str = value => (value === null || value === undefined ? '' : String(value));
    var day = value => (value ? String(value).slice(0, 10) : '');
    var q = str(Server.Context.QueryParameters['q']).trim();
    if (q.length > 100) throw new Error('Search text must be at most 100 characters.');
    if (q.length < 2) return JSON.stringify({ status: 'success', query: q, hits: [] });
    if (!Server.User || !Server.User.contactid) throw new Error('Sign in to search records.');
    var top = Math.min(Math.max(parseInt(Server.Context.QueryParameters['top'] || '20', 10) || 20, 1), 50);
    var types = (str(Server.Context.QueryParameters['types']) || 'opp,account,contact,partner').split(',');
    if (types.some(type => ['opp', 'account', 'contact', 'partner'].indexOf(type) < 0)) throw new Error('Unknown search category.');
    var needle = q.toLowerCase();
    var terms = needle.split(/\s+/);
    var filter = value => '&$filter=' + encodeURIComponent(value);

    var parse = response => {
      var result = typeof response === 'string' ? JSON.parse(response) : response;
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Invalid Dataverse response.');
      var status = result.StatusCode === undefined ? 200 : Number(result.StatusCode);
      if (!Number.isInteger(status) || status < 200 || status >= 300 || result.IsSuccessStatusCode === false || result.ServerError) {
        var failure = new Error(result.ServerErrorMessage || result.ReasonPhrase || 'Dataverse read failed.');
        failure.httpStatus = status;
        throw failure;
      }
      var body = result.Body === undefined ? result : result.Body;
      if (typeof body === 'string') {
        try {
          body = body ? JSON.parse(body) : {};
        } catch (cause) {
          var invalid = new Error('Invalid Dataverse response body.');
          invalid.httpStatus = status;
          throw invalid;
        }
      }
      if (status >= 400 || result.IsSuccessStatusCode === false || (body && body.error)) {
        var error = new Error((body && body.error && body.error.message) || result.ReasonPhrase || 'Dataverse read failed.');
        error.httpStatus = status;
        throw error;
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid Dataverse response body.');
      return body;
    };
    var read = (step, set, query, id) => {
      currentStep = step;
      try {
        var response = id ? Server.Connector.Dataverse.RetrieveRecord(set, id, query) : Server.Connector.Dataverse.RetrieveMultipleRecords(set, query);
        var body = parse(response);
        if (debug) trace.push({ step: step, ok: true, rows: Array.isArray(body.value) ? body.value.length : undefined });
        return body;
      } catch (error) {
        error.failedStep = step;
        Server.Logger.Error('global-search ' + step + ' failed: ' + error.message);
        throw error;
      }
    };
    // Related-field contains filters are not supported reliably by this connector. Bound the scoped
    // candidate read and disclose incomplete coverage instead of silently reporting an exhaustive search.
    var list = (step, set, query) => {
      var body = read(step, set, query + '&$top=' + (CANDIDATE_LIMIT + 1));
      if (!Array.isArray(body.value) || body.value.some(row => !row || typeof row !== 'object' || Array.isArray(row)))
        throw new Error('Dataverse collection is missing value.');
      if (body.value.length > CANDIDATE_LIMIT || body['@odata.nextLink']) warnings.add('coverage');
      return body.value.slice(0, CANDIDATE_LIMIT);
    };
    var roles = Server.User.Roles || [];
    if (typeof roles === 'string') roles = roles.trim().charAt(0) === '[' ? JSON.parse(roles) : [roles];
    var isAdmin = Array.isArray(roles) && roles.indexOf('Partner Admin') >= 0;
    var me = read('me', 'contacts', '$select=contactid,_parentcustomerid_value', Server.User.contactid);
    if (!me.contactid || !me._parentcustomerid_value) throw new Error('A partner account is required to search records.');
    var partnerId = me._parentcustomerid_value;
    var items = [];
    var OPP_STATUS = {
      1: 'In Progress',
      2: 'On Hold',
      200000: 'In Progress',
      100000001: 'Delivered',
      100000003: 'Accepted',
      100000006: 'Declined',
      756150000: 'Returned',
      100000007: 'Expired',
      3: 'Won',
      100000004: 'Purchased',
      4: 'Lost',
      5: 'Lost',
    };
    var REG_STATUS = {
      100000000: 'New',
      100000001: 'Under Review',
      100000002: 'Approved',
      100000007: 'Declined',
      100000008: 'Expired',
      100000010: 'Expiring',
      100000006: 'Closed',
    };
    var PARTNER_ROLE = { 756150000: 'Partner Admin', 756150001: 'Partner Manager', 756150002: 'Partner Seller' };
    var people = (scope, type) =>
      list(
        type,
        'contacts',
        '$select=contactid,fullname,jobtitle,emailaddress1,telephone1,adx_partnercontactrole,statecode' +
          '&$expand=parentcustomerid_account($select=accountid,name)' +
          filter(scope) +
          '&$orderby=fullname,contactid',
      ).map(contact => {
        var account = contact.parentcustomerid_account ? str(contact.parentcustomerid_account.name) : '';
        var role = PARTNER_ROLE[contact.adx_partnercontactrole] || '';
        return {
          type: type,
          id: contact.contactid,
          title: str(contact.fullname),
          active: contact.statecode === 0,
          jobTitle: str(contact.jobtitle),
          account: account,
          email: str(contact.emailaddress1),
          partnerRole: role,
          fields:
            type === 'partner'
              ? { Email: str(contact.emailaddress1), 'Partner role': role, 'Job title': str(contact.jobtitle) }
              : { Email: str(contact.emailaddress1), 'Job title': str(contact.jobtitle), Account: account, Phone: str(contact.telephone1) },
        };
      });
    if (types.indexOf('contact') >= 0) {
      items = items.concat(
        people('_msa_managingpartnerid_value eq ' + partnerId + ' and adx_partnercontactrole eq null and _parentcustomerid_value ne ' + partnerId, 'contact'),
      );
    }
    if (types.indexOf('partner') >= 0 && isAdmin) {
      items = items.concat(people('_parentcustomerid_value eq ' + partnerId, 'partner'));
    }
    if (types.indexOf('account') >= 0) {
      var accounts = list(
        'accounts',
        'accounts',
        '$select=accountid,name,address1_city,address1_stateorprovince,telephone1,websiteurl,statecode' +
          '&$expand=primarycontactid($select=contactid,fullname)' +
          filter('_msa_managingpartnerid_value eq ' + partnerId + ' and accountclassificationcode eq 1') +
          '&$orderby=name,accountid',
      );
      accounts.forEach(account => {
        var city = [str(account.address1_city), str(account.address1_stateorprovince)].filter(value => value).join(', ');
        var contact = account.primarycontactid ? str(account.primarycontactid.fullname) : '';
        items.push({
          type: 'account',
          id: account.accountid,
          title: str(account.name),
          active: account.statecode === 0,
          primaryContact: contact,
          city: city,
          fields: { 'Primary contact': contact, City: city, Phone: str(account.telephone1), Website: str(account.websiteurl) },
        });
      });
    }
    if (types.indexOf('opp') >= 0) {
      var membership =
        '((statuscode eq 100000001 and adx_partnercollaboration ne true)' +
        ' or statuscode eq 100000003 or statuscode eq 3 or statuscode eq 100000004' +
        ' or statuscode eq 4 or statuscode eq 5 or statuscode eq 2' +
        ' or (statuscode eq 1 and adx_partnercreated eq true))';
      var opps = list(
        'opportunities',
        'opportunities',
        '$select=opportunityid,name,estimatedvalue,estimatedclosedate,statecode,statuscode,adx_expirydate,' +
          'adx_partnercreated,adx_partnercollaboration,description,_customerid_value' +
          '&$expand=customerid_account($select=accountid,name),adx_TerritoryId($select=territoryid,name),msa_partneroppid($select=contactid,firstname,lastname)' +
          filter(membership) +
          '&$orderby=modifiedon desc,opportunityid',
      );
      var regsByOpp = new Map();
      if (opps.length) {
        try {
          var regs = list(
            'registrations',
            'adx_dealregistrationrequests',
            '$select=adx_dealregistrationrequestid,statecode,statuscode,adx_expirationdate,_adx_opportunityid_value' +
              '&$orderby=adx_submissiondate desc,adx_dealregistrationrequestid',
          );
          regs.forEach(reg => {
            if (!regsByOpp.has(reg._adx_opportunityid_value)) regsByOpp.set(reg._adx_opportunityid_value, reg);
          });
        } catch (error) {
          if (error.httpStatus === 401) throw error;
          warnings.add('registrations');
          Server.Logger.Warn('global-search returning partial results without registration details.');
          if (debug) trace.push({ step: 'registrations', ok: false, httpStatus: error.httpStatus });
        }
      }
      opps.forEach(opp => {
        var status = opp.statecode === 2 ? 'Lost' : OPP_STATUS[opp.statuscode] || 'In Progress';
        var reg = regsByOpp.get(opp.opportunityid);
        var regStatus = reg ? (reg.statecode === 1 ? 'Closed' : REG_STATUS[reg.statuscode] || 'New') : '';
        var customer = opp.customerid_account ? str(opp.customerid_account.name) : '';
        var partnerContact = opp.msa_partneroppid
          ? [str(opp.msa_partneroppid.firstname), str(opp.msa_partneroppid.lastname)].filter(value => value).join(' ')
          : '';
        items.push({
          type: 'opp',
          id: opp.opportunityid,
          title: str(opp.name),
          status: status,
          customer: customer,
          revenue: opp.estimatedvalue === null || opp.estimatedvalue === undefined ? null : Number(opp.estimatedvalue),
          closeDate: day(opp.estimatedclosedate),
          expiryDate: day(opp.adx_expirydate),
          collaboration: opp.adx_partnercollaboration === true,
          distributed: status === 'Delivered' && opp.adx_partnercollaboration !== true,
          registrationStatus: regStatus,
          registrationExpires: reg ? day(reg.adx_expirationdate) : '',
          fields: {
            Customer: customer,
            Status: status,
            'Registration status': regStatus,
            'Partner contact': partnerContact,
            Territory: opp.adx_TerritoryId ? str(opp.adx_TerritoryId.name) : '',
            Description: str(opp.description),
          },
        });
      });
    }

    // Keep scores in parity with rankItems in src/lib/search.ts; contract tests exercise both.
    var hits = [];
    items.forEach(item => {
      var title = item.title.toLowerCase();
      var score = title.indexOf(needle) === 0 ? 120 : title.indexOf(needle) >= 0 ? 100 : terms.every(term => title.indexOf(term) >= 0) ? 80 : 0;
      var field;
      if (!score) {
        var entry = Object.entries(item.fields).find(pair => pair[1] && pair[1].toLowerCase().indexOf(needle) >= 0);
        if (entry) {
          score = 50;
          field = { label: entry[0], value: entry[1] };
        } else if (terms.length > 1) {
          var haystack = (title + ' ' + Object.values(item.fields).join(' ')).toLowerCase();
          if (terms.every(term => haystack.indexOf(term) >= 0)) score = 20;
        }
      }
      if (score) hits.push({ item: item, score: score, field: field });
    });
    hits.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
    var counts = {};
    hits = hits.filter(hit => {
      var type = hit.item.type;
      counts[type] = (counts[type] || 0) + 1;
      if (counts[type] > top) {
        warnings.add('results');
        return false;
      }
      return true;
    });
    var snippet = text => {
      if (text.length <= 200) return text;
      var matchAt = text.toLowerCase().indexOf(needle);
      var start = Math.max(0, matchAt - 60);
      return (start ? '...' : '') + text.slice(start, start + 194) + (start + 194 < text.length ? '...' : '');
    };
    hits.forEach(hit => {
      if (hit.item.fields.Description) hit.item.fields.Description = snippet(hit.item.fields.Description);
      if (hit.field) hit.field.value = snippet(hit.field.value);
    });
    var messages = [];
    if (warnings.has('coverage'))
      messages.push('Search coverage is limited to the first 500 accessible records per category. More records may be available on the list pages.');
    if (warnings.has('results')) messages.push('Only the top ' + top + ' matches per category are shown.');
    if (warnings.has('registrations')) messages.push('Registration details are unavailable; some opportunity matches may be missing. Try again.');
    // Keep items for already-open clients while the SPA and endpoint are deployed separately.
    var out = {
      status: warnings.size ? 'partial' : 'success',
      query: q,
      hits: hits,
      items: hits.map(hit => hit.item),
      message: messages.join(' ') || undefined,
    };
    if (debug) out.debug = { trace: trace };
    Server.Logger.Log('global-search returned ' + hits.length + ' matches; status=' + out.status);
    return JSON.stringify(out);
  } catch (error) {
    Server.Logger.Error('global-search GET failed at ' + currentStep + ': ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: 'Record search is unavailable. Try again.',
      debug: debug ? { failedStep: error.failedStep || currentStep, httpStatus: error.httpStatus } : undefined,
    });
  }
}
