// Server Logic: assistant
// Purpose: Partner assistant for the global search chat. Grounded and deterministic (no LLM, no secrets):
//          classifies the question (attention, close-next, pipeline, results-for, summarize <record>), reads the
//          caller's permission-scoped Dataverse rows and returns structured answer blocks with citations.
//          Read-only — never writes. Program FAQ answers are served client-side from static content.
// API URL: https://<site-url>/_api/serverlogics/assistant   (POST { "message": "..." })
// Response: { status, intent, blocks: [{ kind: "p"|"ol"|"ul", parts | items }], citations: [SearchItem], followUps: [] }

function post() {
  try {
    Server.Logger.Log('assistant POST called');
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

    // Server-side text filters first; if the runtime rejects them, fall back to the scoped query + client match.
    var orFallback = (label, primary, fallback) => {
      try {
        return primary();
      } catch (err) {
        if (err.status !== 400 && err.status !== 501) throw err;
        Server.Logger.Warn('assistant ' + label + ' falling back: ' + err.message);
        return fallback();
      }
    };
    var str = v => (v === null || v === undefined ? '' : String(v));
    var day = v => (v ? String(v).slice(0, 10) : '');
    var filter = s => '&$filter=' + encodeURIComponent(s);
    var lit = s => "'" + String(s).replace(/'/g, "''") + "'";

    var body = JSON.parse(Server.Context.Body || '{}');
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      typeof body.message !== 'string' ||
      !body.message.trim() ||
      body.message.trim().length > 500
    ) {
      return JSON.stringify({ status: 'error', message: 'Ask a question of 1 to 500 characters.' });
    }
    var message = body.message.trim();
    var text = message.toLowerCase();

    var me = one('contacts', Server.User.contactid, '?$select=contactid,_parentcustomerid_value');
    var partnerId = me._parentcustomerid_value || null;

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
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var fmtDate = iso => {
      if (!iso) return 'no date';
      var p = iso.split('-');
      return MONTHS[Number(p[1]) - 1] + ' ' + Number(p[2]) + ', ' + p[0];
    };
    var money = n =>
      '$' +
      Math.round(Number(n || 0))
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var today = new Date().toISOString().slice(0, 10);
    var daysUntil = iso => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
    var when = iso => {
      var d = daysUntil(iso);
      if (d < 0) return 'expired ' + fmtDate(iso);
      if (d === 0) return 'expires today';
      if (d === 1) return 'expires tomorrow, ' + fmtDate(iso);
      return 'expires in ' + d + ' days, ' + fmtDate(iso);
    };

    var membership =
      '((statuscode eq 100000001 and adx_partnercollaboration ne true)' +
      ' or statuscode eq 100000003 or statuscode eq 3 or statuscode eq 100000004' +
      ' or statuscode eq 4 or statuscode eq 5 or statuscode eq 2' +
      ' or (statuscode eq 1 and adx_partnercreated eq true))';
    var toOpp = o => {
      var status = o.statecode === 2 ? 'Lost' : OPP_STATUS[o.statuscode] || 'In Progress';
      var customer = o.customerid_account ? str(o.customerid_account.name) : '';
      return {
        type: 'opp',
        id: o.opportunityid,
        title: str(o.name),
        status: status,
        customer: customer,
        revenue: o.estimatedvalue === null || o.estimatedvalue === undefined ? null : Number(o.estimatedvalue),
        closeDate: day(o.estimatedclosedate),
        expiryDate: day(o.adx_expirydate),
        collaboration: o.adx_partnercollaboration === true,
        distributed: status === 'Delivered' && o.adx_partnercollaboration !== true,
        description: str(o.description).slice(0, 200),
        registrationStatus: '',
        registrationExpires: '',
        fields: { Customer: customer, Status: status },
      };
    };
    var oppSelect =
      '?$select=opportunityid,name,estimatedvalue,estimatedclosedate,statecode,statuscode,adx_expirydate,adx_partnercreated,adx_partnercollaboration,description' +
      '&$expand=customerid_account($select=accountid,name)';
    var loadOpps = (extra, tail) =>
      list('opportunities', oppSelect + filter(membership + (extra ? ' and (' + extra + ')' : '')) + (tail || '&$orderby=modifiedon desc')).map(toOpp);
    var attachRegistrations = opps => {
      if (!opps.length) return opps;
      var regSelect = '?$select=adx_dealregistrationrequestid,statecode,statuscode,adx_expirationdate,_adx_opportunityid_value';
      var regs = orFallback(
        'registrations',
        () =>
          list(
            'adx_dealregistrationrequests',
            regSelect + filter(opps.map(o => '_adx_opportunityid_value eq ' + o.id).join(' or ')) + '&$orderby=adx_submissiondate desc',
          ),
        () =>
          list('adx_dealregistrationrequests', regSelect + '&$orderby=adx_submissiondate desc').filter(r =>
            opps.some(o => o.id === r._adx_opportunityid_value),
          ),
      );
      var byOpportunity = new Map();
      regs.forEach(reg => {
        var id = str(reg._adx_opportunityid_value).toLowerCase();
        if (!byOpportunity.has(id)) byOpportunity.set(id, reg);
      });
      opps.forEach(o => {
        var reg = byOpportunity.get(o.id.toLowerCase());
        if (reg) {
          o.registrationStatus = reg.statecode === 1 ? 'Closed' : REG_STATUS[reg.statuscode] || 'New';
          o.registrationExpires = day(reg.adx_expirationdate);
          o.fields['Registration status'] = o.registrationStatus;
        }
      });
      return opps;
    };
    var isOpen = o => o.status === 'In Progress' || o.status === 'On Hold' || o.status === 'Accepted';

    var citations = [];
    var cite = item => {
      for (var i = 0; i < citations.length; i++) if (citations[i].id === item.id) return i + 1;
      citations.push(item);
      return citations.length;
    };
    var p = parts => ({ kind: 'p', parts: parts });
    var t = (s, strong) => (strong ? { text: s, strong: true } : { text: s });
    var c = item => ({ text: '', cite: cite(item) });
    var coverageNotes = new Set();
    var answer = (intent, blocks, followUps) => {
      coverageNotes.forEach(note => blocks.push(p([t(note)])));
      return JSON.stringify({ status: 'success', intent: intent, blocks: blocks, citations: citations, followUps: followUps || [] });
    };

    // 1. "Summarize the results for "<query>""
    var resultsFor = /results for ["“](.+?)["”]/i.exec(message);
    // 2. "Summarize <record>" / "Tell me about <record>"
    var subject = resultsFor
      ? ''
      : message
          .replace(/^(summari[sz]e|tell me about|give me an overview of|overview of|who is|what is)\s+/i, '')
          .replace(/[?."“”]/g, '')
          .trim();
    var summarize = !resultsFor && /^(summari[sz]e|tell me about|give me an overview of|overview of|who is)\b/i.test(message);

    if (resultsFor || summarize) {
      coverageNotes.add('This summary includes up to 10 matching opportunities and 5 accounts and contacts each; it is not an exhaustive search.');
      var term = resultsFor ? resultsFor[1] : subject;
      var has = col => 'contains(' + col + ',' + lit(term) + ')';
      var needle = term.toLowerCase();
      var hitText = values => values.some(v => str(v).toLowerCase().indexOf(needle) >= 0);
      var oppHits = attachRegistrations(
        orFallback(
          'opportunities',
          () => loadOpps(has('name') + ' or ' + has('customerid_account/name'), '&$orderby=modifiedon desc&$top=10'),
          () => {
            coverageNotes.add('Opportunity matching was limited to the first 500 accessible candidates.');
            return loadOpps(null, '&$orderby=modifiedon desc&$top=500')
              .filter(o => hitText([o.title, o.customer]))
              .slice(0, 10);
          },
        ),
      );
      var accSelect = '?$select=accountid,name,address1_city,address1_stateorprovince,statecode&$expand=primarycontactid($select=contactid,fullname,jobtitle)';
      var accScope = partnerId ? '_msa_managingpartnerid_value eq ' + partnerId + ' and accountclassificationcode eq 1' : '';
      var accHits = partnerId
        ? orFallback(
            'accounts',
            () => list('accounts', accSelect + filter(accScope + ' and ' + has('name')) + '&$top=5'),
            () => {
              coverageNotes.add('Account matching was limited to the first 500 accessible candidates.');
              return list('accounts', accSelect + filter(accScope) + '&$top=500')
                .filter(a => hitText([a.name]))
                .slice(0, 5);
            },
          ).map(a => ({
            type: 'account',
            id: a.accountid,
            title: str(a.name),
            active: a.statecode === 0,
            city: [str(a.address1_city), str(a.address1_stateorprovince)].filter(x => x).join(', '),
            primaryContact: a.primarycontactid ? str(a.primarycontactid.fullname) : '',
            primaryContactJob: a.primarycontactid ? str(a.primarycontactid.jobtitle) : '',
            fields: {},
          }))
        : [];
      var conSelect = '?$select=contactid,fullname,jobtitle,emailaddress1&$expand=parentcustomerid_account($select=accountid,name)';
      var conScope = partnerId ? '_msa_managingpartnerid_value eq ' + partnerId + ' and adx_partnercontactrole eq null' : '';
      var conHits = partnerId
        ? orFallback(
            'contacts',
            () => list('contacts', conSelect + filter(conScope + ' and ' + has('fullname')) + '&$top=5'),
            () => {
              coverageNotes.add('Contact matching was limited to the first 500 accessible candidates.');
              return list('contacts', conSelect + filter(conScope) + '&$top=500')
                .filter(x => hitText([x.fullname]))
                .slice(0, 5);
            },
          ).map(x => ({
            type: 'contact',
            id: x.contactid,
            title: str(x.fullname),
            jobTitle: str(x.jobtitle),
            email: str(x.emailaddress1),
            account: x.parentcustomerid_account ? str(x.parentcustomerid_account.name) : '',
            fields: {},
          }))
        : [];

      if (resultsFor) {
        var all = oppHits.concat(accHits, conHits);
        if (!all.length) return answer('results', [p([t('No matches for “' + term + '” were found in the records reviewed.')])]);
        var counts = [];
        if (oppHits.length) counts.push(oppHits.length + ' opportunit' + (oppHits.length === 1 ? 'y' : 'ies'));
        if (accHits.length) counts.push(accHits.length + ' customer account' + (accHits.length === 1 ? '' : 's'));
        if (conHits.length) counts.push(conHits.length + ' contact' + (conHits.length === 1 ? '' : 's'));
        return answer('results', [
          p([t('“' + term + '” matches ' + counts.join(', ') + '. The most relevant:')]),
          {
            kind: 'ol',
            items: all
              .slice(0, 4)
              .map(i => [
                t(i.title, true),
                t(
                  ' — ' +
                    (i.type === 'opp'
                      ? i.customer + ', ' + money(i.revenue) + ', ' + i.status
                      : i.type === 'account'
                        ? 'customer account' + (i.city ? ' in ' + i.city : '')
                        : (i.jobTitle || 'contact') + (i.account ? ' at ' + i.account : '')) +
                    ' ',
                ),
                c(i),
              ]),
          },
        ]);
      }

      var opp = oppHits.filter(o => o.title.toLowerCase() === term.toLowerCase())[0] || (oppHits.length && !accHits.length ? oppHits[0] : null);
      if (opp) {
        var what = opp.distributed
          ? 'a distributed opportunity waiting for your response'
          : opp.collaboration
            ? 'a collaborative opportunity (read-only)'
            : 'an ' + opp.status.toLowerCase() + ' opportunity';
        var blocks = [
          p([
            t(opp.title, true),
            t(' is ' + what + ' for ' + opp.customer + ', worth ' + money(opp.revenue) + (opp.distributed ? '' : ', closing ' + fmtDate(opp.closeDate)) + '. '),
            c(opp),
          ]),
        ];
        var facts = [
          [
            t(
              'Registration: ' +
                (opp.registrationStatus
                  ? opp.registrationStatus + (opp.registrationExpires ? ' (until ' + fmtDate(opp.registrationExpires) + ')' : '')
                  : 'Not registered'),
            ),
          ],
        ];
        if (opp.distributed && opp.expiryDate) facts.push([t('Response due: ' + when(opp.expiryDate))]);
        if (opp.description) facts.push([t(opp.description)]);
        blocks.push({ kind: 'ul', items: facts });
        if (opp.registrationStatus === 'Expiring')
          blocks.push(p([t('Action: ', true), t('extend the registration from the opportunity’s details page to keep protection.')]));
        return answer('summary', blocks, ['Which deals need my attention this week?', 'Which opportunities close next?']);
      }
      var acc = accHits[0];
      if (acc) {
        var accOpps = oppHits.filter(o => o.customer === acc.title);
        var blocksA = [
          p([
            t(acc.title, true),
            t(' is a customer account' + (acc.city ? ' in ' + acc.city : '') + ' '),
            c(acc),
            t(acc.primaryContact ? '. The primary contact is ' + acc.primaryContact + (acc.primaryContactJob ? ', ' + acc.primaryContactJob : '') + '.' : '.'),
          ]),
        ];
        if (accOpps.length) {
          blocksA.push(p([t('Opportunities you can see:')]));
          blocksA.push({
            kind: 'ul',
            items: accOpps.map(o => [
              t(
                o.title +
                  ' — ' +
                  money(o.revenue) +
                  ', ' +
                  o.status +
                  (o.registrationStatus === 'Expiring' ? '. Registration expiring ' + fmtDate(o.registrationExpires) : '') +
                  ' ',
              ),
              c(o),
            ]),
          });
        } else {
          blocksA.push(p([t('No matching opportunities for this account were found in the records reviewed.')]));
        }
        return answer('summary', blocksA, ['Which deals need my attention this week?', 'Show my open pipeline by customer']);
      }
      var con = conHits[0];
      if (con) {
        return answer('summary', [
          p([
            t(con.title, true),
            t(' is ' + (con.jobTitle || 'a contact') + (con.account ? ' at ' + con.account : '') + (con.email ? '. Email ' + con.email : '') + '. '),
            c(con),
          ]),
        ]);
      }
      return answer('none', [
        p([t('I couldn’t find “' + term + '” among the records you can access. Try the exact name of a customer, opportunity or contact.')]),
      ]);
    }

    if (/attention|this week|expir|urgent|deadline|need/.test(text)) {
      coverageNotes.add('This review includes up to 20 distributed opportunities and 20 expiring registrations, ordered by due date.');
      var distributed = loadOpps('statuscode eq 100000001 and adx_partnercollaboration ne true', '&$orderby=adx_expirydate asc&$top=20').filter(
        o => o.distributed,
      );
      var expiringRegs = list(
        'adx_dealregistrationrequests',
        '?$select=adx_dealregistrationrequestid,adx_expirationdate,_adx_opportunityid_value' +
          filter('statecode eq 0 and statuscode eq 100000010') +
          '&$orderby=adx_expirationdate asc&$top=20',
      );
      var regOpps = expiringRegs.length ? loadOpps(expiringRegs.map(r => 'opportunityid eq ' + r._adx_opportunityid_value).join(' or '), '&$top=20') : [];
      var items = distributed.map(o => ({
        o: o,
        due: o.expiryDate || '9999-12-31',
        text:
          ' (' + o.customer + ', ' + money(o.revenue) + ') — Distributed opportunity ' + (o.expiryDate ? when(o.expiryDate) : 'awaiting your response') + '. ',
      }));
      expiringRegs.forEach(r => {
        var o = regOpps.filter(x => x.id === r._adx_opportunityid_value)[0];
        if (o)
          items.push({
            o: o,
            due: day(r.adx_expirationdate),
            text: ' (' + o.customer + ', ' + money(o.revenue) + ') — Deal registration ' + when(day(r.adx_expirationdate)) + ' — extend to keep protection. ',
          });
      });
      items.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
      if (!items.length)
        return answer(
          'attention',
          [p([t('No actionable distributed opportunities or expiring registrations were found in the records reviewed.')])],
          ['Which opportunities close next?'],
        );
      return answer(
        'attention',
        [
          p([t(items.length + (items.length === 1 ? ' item needs' : ' items need') + ' your attention, most urgent first:')]),
          { kind: 'ol', items: items.map(i => [t(i.o.title, true), t(i.text), c(i.o)]) },
          p([t('Accept or decline distributed opportunities from their summary page; extend a registration from the opportunity’s details page.')]),
        ],
        ['Which opportunities close next?', 'Show my open pipeline by customer'],
      );
    }

    var openOpps = tail =>
      loadOpps('statuscode eq 1 or statuscode eq 2 or statuscode eq 100000003', '&$orderby=estimatedclosedate asc' + (tail || '')).filter(isOpen);

    if (/clos/.test(text)) {
      var next = openOpps('&$top=3').slice(0, 3);
      if (!next.length) return answer('close', [p([t('You have no open opportunities.')])]);
      return answer(
        'close',
        [
          p([t('Your next ' + next.length + ' open opportunit' + (next.length === 1 ? 'y' : 'ies') + ' by estimated close date:')]),
          { kind: 'ol', items: next.map(o => [t(o.title, true), t(' — ' + fmtDate(o.closeDate) + ', ' + money(o.revenue) + ', ' + o.status + ' '), c(o)]) },
        ],
        ['Which deals need my attention this week?', 'Show my open pipeline by customer'],
      );
    }

    if (/pipeline|revenue|forecast/.test(text)) {
      var open = openOpps().sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
      var total = open.reduce((s, o) => s + Number(o.revenue || 0), 0);
      if (!open.length) return answer('pipeline', [p([t('You have no open opportunities.')])]);
      if (open.length > 20)
        coverageNotes.add('Showing the 20 highest-value opportunities. The total includes all ' + open.length + ' accessible open opportunities.');
      return answer(
        'pipeline',
        [
          p([t('Your open pipeline is '), t(money(total), true), t(' across ' + open.length + ' opportunit' + (open.length === 1 ? 'y' : 'ies') + ':')]),
          { kind: 'ul', items: open.slice(0, 20).map(o => [t(o.customer + ' — ' + money(o.revenue) + ' (' + o.title + ') '), c(o)]) },
          p([t('Distributed opportunities awaiting a response aren’t included until accepted.')]),
        ],
        ['Which opportunities close next?', 'Which deals need my attention this week?'],
      );
    }

    return answer(
      'unknown',
      [
        p([
          t(
            'I can help with deadlines (“Which deals need my attention?”), close dates, your open pipeline, or a summary of a customer, opportunity or contact you can access.',
          ),
        ]),
      ],
      ['Which deals need my attention this week?', 'Show my open pipeline by customer'],
    );
  } catch (err) {
    Server.Logger.Error('assistant POST failed: ' + err.message);
    return JSON.stringify({ status: 'error', method: 'POST', message: 'The assistant could not load the information needed to answer. Please try again.' });
  }
}
