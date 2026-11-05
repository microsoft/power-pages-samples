// Server Logic: opportunity-action
// Purpose: Opportunity status actions (A-02…A-07) without a cloud flow. Replaces "PRM – Opportunity action": the same
//          role, partner, collaboration, seller-assignment and status checks are re-read from Dataverse. Server Logic
//          can't invoke ExecuteWorkflow (403), so accept/decline/return apply the PRM Accept/Decline/Return Opportunity
//          workflow steps as one update; win/lose use WinOpportunity/LoseOpportunity (Dataverse rejects a plain update to
//          Won/Lost) and reopen is an update.
//          POST { action: "accept" | "decline" | "return" | "win" | "lose" | "reopen", opportunityid }
// API URL: https://<site-url>/_api/serverlogics/opportunity-action

function post() {
  // DEBUG (temporary): step trace and the last raw connector response are returned with errors to locate the failure.
  var step = 'start';
  var trace = [];
  var lastResponse = null;
  var mark = name => {
    step = name;
    trace.push(name);
    Server.Logger.Log('opportunity-action step: ' + name);
  };
  var reply = (status, message, extra) =>
    JSON.stringify({ status: status, method: 'POST', message: message, debug: status === 'error' ? debugInfo(extra) : undefined });
  var debugInfo = extra => {
    var out = { step: step, trace: trace, activityId: Server.Context.ActivityId, lastResponse: lastResponse };
    Object.keys(extra || {}).forEach(k => {
      out[k] = extra[k];
    });
    return out;
  };
  // Keeps a trimmed copy of each connector response for the debug payload and the server log.
  var capture = (label, response) => {
    var text = typeof response === 'string' ? response : JSON.stringify(response);
    lastResponse = { call: label, raw: String(text).slice(0, 2000) };
    Server.Logger.Log('opportunity-action ' + label + ' response: ' + String(text).slice(0, 2000));
    return response;
  };
  var DENIED = "You don't have permission to do this. Refresh the page and try again.";
  var FAILED = 'The action could not be completed. Refresh the page and try again.';
  try {
    if (!Server.User || !Server.User.contactid) return reply('error', DENIED);

    var parse = (response, label) => {
      capture(label, response);
      var r = typeof response === 'string' ? JSON.parse(response) : response;
      if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('Invalid Dataverse response.');
      var status = r.StatusCode === undefined ? 200 : Number(r.StatusCode);
      if (!Number.isInteger(status) || status < 200 || status >= 300 || r.IsSuccessStatusCode === false || r.ServerError) {
        throw new Error('Dataverse request failed (' + status + '): ' + (r.ServerErrorMessage || r.ReasonPhrase || 'Unsuccessful connector response.'));
      }
      var body = r.Body === undefined ? r : r.Body;
      if (typeof body === 'string') body = body.trim() ? JSON.parse(body) : {};
      if (body && body.error) throw new Error('Dataverse operation failed: ' + (body.error.message || 'Unknown error.'));
      return body || {};
    };
    var one = (set, id, select) => parse(Server.Connector.Dataverse.RetrieveRecord(set, id, '$select=' + select, true), 'RetrieveRecord ' + set);
    var isGuid = v => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
    // GUIDs are compared case-insensitively so a differently-cased id can't slip past an equality check.
    var same = (a, b) => !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();
    var UNAVAILABLE = "This action isn't available for the opportunity's current status. Refresh the page and try again.";

    var ROLE = { admin: 756150000, manager: 756150001, seller: 756150002 };
    var STATUS = { inProgress: 1, delivered: 100000001, accepted: 100000003, declined: 100000006, returned: 756150000 };
    var OPEN_STATUSES = [1, 2, 200000, 100000003];
    var REASON_FOR_RETURN = 100000000;
    var DONE = {
      accept: 'The opportunity has been accepted.',
      decline: 'The opportunity has been declined.',
      return: 'The opportunity has been returned.',
      win: 'The opportunity has been closed as won.',
      lose: 'The opportunity has been closed as lost.',
      reopen: 'The opportunity has been reopened.',
    };

    mark('input');
    var input = JSON.parse(Server.Context.Body || '{}');
    var action = input && typeof input.action === 'string' ? input.action.toLowerCase() : '';
    var opportunityId = input ? input.opportunityid : undefined;
    if (!Object.hasOwn(DONE, action) || !isGuid(opportunityId)) return reply('error', FAILED);

    mark('caller');
    var me = one('contacts', Server.User.contactid, 'contactid,statecode,adx_partnercontactrole,_parentcustomerid_value');
    if (me.statecode !== 0 || [ROLE.admin, ROLE.manager, ROLE.seller].indexOf(me.adx_partnercontactrole) < 0 || !me._parentcustomerid_value) {
      return reply('error', DENIED);
    }

    mark('opportunity');
    var opp;
    try {
      opp = one(
        'opportunities',
        opportunityId,
        'opportunityid,statecode,statuscode,description,_msa_partnerid_value,_msa_partneroppid_value,adx_partnercollaboration,adx_partnercreated',
      );
    } catch (readError) {
      // Not readable under the caller's table permissions (or missing): same answer as an out-of-scope record.
      Server.Logger.Warn('opportunity-action opportunity read failed: ' + readError.message);
      return reply('error', DENIED, { reason: 'opportunity not readable', error: readError.message });
    }
    if (!same(opp.opportunityid, opportunityId)) return reply('error', DENIED, { reason: 'opportunity id mismatch' });
    Server.Logger.Log(
      'opportunity-action caller role ' + me.adx_partnercontactrole + ', opportunity state ' + opp.statecode + '/' + opp.statuscode +
        ', collaboration ' + opp.adx_partnercollaboration + ', partner-created ' + opp.adx_partnercreated,
    );

    // Scope: the caller's partner owns the opportunity, it isn't a collaborative (read-only) one, and a seller may act
    // only on opportunities assigned to them and can't accept or decline.
    if (!same(opp._msa_partnerid_value, me._parentcustomerid_value) || opp.adx_partnercollaboration === true) {
      return reply('error', DENIED, { reason: 'partner or collaboration scope' });
    }
    if (
      me.adx_partnercontactrole === ROLE.seller &&
      (action === 'accept' || action === 'decline' || !same(opp._msa_partneroppid_value, Server.User.contactid))
    ) {
      return reply('error', DENIED, { reason: 'seller scope' });
    }

    var open = opp.statecode === 0;
    var allowed =
      action === 'accept' || action === 'decline'
        ? open && opp.statuscode === STATUS.delivered
        : action === 'return'
          ? open && opp.statuscode === STATUS.accepted && opp.adx_partnercreated !== true
          : action === 'win' || action === 'lose'
            ? open && OPEN_STATUSES.indexOf(opp.statuscode) >= 0
            : !open;
    if (!allowed) return reply('error', UNAVAILABLE, { reason: 'status', statecode: opp.statecode, statuscode: opp.statuscode });

    mark('run ' + action);
    var update = (changes, label) => parse(Server.Connector.Dataverse.UpdateRecord('opportunities', opportunityId, JSON.stringify(changes)), label);
    // Partner name and time for the description notes the Decline/Return workflows append; the name is best effort.
    var partnerName = () => {
      try {
        return one('accounts', opp._msa_partnerid_value, 'accountid,name').name || '';
      } catch (nameError) {
        Server.Logger.Warn('opportunity-action partner name read failed: ' + nameError.message);
        return '';
      }
    };
    var now = () => new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    // description holds at most 2000 characters; keep the note and trim the existing text if needed.
    var appendNote = note => (opp.description || '').slice(0, Math.max(0, 2000 - note.length)) + note;

    if (action === 'accept') {
      // PRM "Accept Opportunity": set the accepted date, then status Accepted.
      update({ adx_accepteddate: new Date().toISOString(), statecode: 0, statuscode: STATUS.accepted }, 'UpdateRecord accept');
    } else if (action === 'decline') {
      // PRM "Decline Opportunity": note who declined and when, then status Declined.
      update(
        {
          description: appendNote(' Declined by partner: ' + partnerName() + ' on date: ' + now() + ' '),
          statecode: 0,
          statuscode: STATUS.declined,
        },
        'UpdateRecord decline',
      );
    } else if (action === 'return') {
      // PRM "Return Accepted Opportunity" (open branch): status Returned, clear the accepted date, partner contact and
      // partner, set the reason for return and note who returned it and when. One update, while the caller is in scope.
      update(
        {
          description: appendNote('Opportunity returned by ' + partnerName() + ' on date: ' + now() + ' '),
          adx_accepteddate: null,
          adx_reasonforreturn: REASON_FOR_RETURN,
          'msa_partnerid': null,
          'msa_partneroppid': null,
          statecode: 0,
          statuscode: STATUS.returned,
        },
        'UpdateRecord return',
      );
    } else if (action === 'win' || action === 'lose') {
      var won = action === 'win';
      parse(
        Server.Connector.Dataverse.InvokeCustomApi(
          'post',
          won ? 'WinOpportunity' : 'LoseOpportunity',
          JSON.stringify({
            Status: won ? 3 : 4,
            OpportunityClose: {
              subject: won ? 'Closed as won from the partner portal' : 'Closed as lost from the partner portal',
              actualend: new Date().toISOString().slice(0, 10),
              'opportunityid@odata.bind': '/opportunities(' + opportunityId + ')',
            },
          }),
        ),
        won ? 'WinOpportunity' : 'LoseOpportunity',
      );
    } else {
      update({ statecode: 0, statuscode: opp.adx_partnercreated === true ? STATUS.inProgress : STATUS.accepted }, 'UpdateRecord reopen');
    }
    return reply('success', DONE[action]);
  } catch (err) {
    Server.Logger.Error('opportunity-action POST failed at ' + step + ': ' + err.message);
    return reply('error', FAILED, { error: err && err.message ? err.message : String(err) });
  }
}
