// Server Logic: technician-work-orders
// Purpose: Technician workspace reads for the Partner Technician web role. Returns the work orders a technician may
//          see — those booked to their own bookable resource, plus those subcontracted to their partner organization
//          (msdyn_workorder.cr798_servicepartnerid) — with bookings, diagnosis and service report, as a safe projection
//          (no pricing, no customer account/contact records; lookup names come from formatted values).
//          Runs in the caller's table-permission context, so every query is also scoped by the Partner Technician
//          table permissions (own bookable resource → own bookings; account-scoped work orders → child bookings,
//          incidents, notes and assets; booked work orders → purchase orders raised from a service report).
//          The single-work-order read also returns the replacement-part catalog (products in the
//          Technician/PurchaseOrder/PartsFamilyId family) for the diagnosis picker.
// API URL: https://<site-url>/_api/serverlogics/technician-work-orders           (all visible work orders)
//          https://<site-url>/_api/serverlogics/technician-work-orders?id=<guid>  (one work order)

function get() {
  // The read in progress, recorded in the server log when a read fails.
  var step = 'start';
  try {
    Server.Logger.Log('technician-work-orders GET called');
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
    var primaryKeys = {
      contacts: 'contactid',
      bookableresources: 'bookableresourceid',
      bookableresourcebookings: 'bookableresourcebookingid',
      msdyn_workorders: 'msdyn_workorderid',
      msdyn_workorderincidents: 'msdyn_workorderincidentid',
      msdyn_customerassets: 'msdyn_customerassetid',
      msdyn_purchaseorders: 'msdyn_purchaseorderid',
      products: 'productid',
      annotations: 'annotationid',
    };
    // Follow the connector's continuation unchanged; never return a first page as a complete list.
    var list = (set, query) => {
      var key = primaryKeys[set];
      if (!key) throw new Error('Unsupported collection.');
      var qs = String(query || '').replace(/^\?/, '');
      if (!/(^|&)\$orderby=/.test(qs)) qs += (qs ? '&' : '') + '$orderby=' + key;
      var rows = [];
      for (var page = 0; page < 20; page++) {
        step = step.split(' | ')[0] + ' | ' + set + '?' + decodeURIComponent(qs);
        var body = parse(Server.Connector.Dataverse.RetrieveMultipleRecords(set, qs));
        if (!Array.isArray(body.value) || body.value.some(row => !row || typeof row[key] !== 'string')) throw new Error('Invalid Dataverse collection.');
        rows = rows.concat(body.value);
        if (rows.length > 5000) throw new Error('The complete collection exceeds the read limit.');
        var next = body['@odata.nextLink'];
        if (!next) return rows;
        var separator = next.indexOf('?');
        if (separator < 0 || separator === next.length - 1) throw new Error('Invalid Dataverse continuation.');
        qs = next.slice(separator + 1);
      }
      throw new Error('Too many pages.');
    };
    var one = (set, id, query) => parse(Server.Connector.Dataverse.RetrieveRecord(set, id, String(query || '').replace(/^\?/, ''), true));
    var isGuid = v => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
    var formatted = (row, field) => row[field + '@OData.Community.Display.V1.FormattedValue'] || undefined;
    var anyOf = (field, ids) => '(' + ids.map(id => field + ' eq ' + id).join(' or ') + ')';
    var chunks = (ids, size) => {
      var out = [];
      for (var i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
      return out;
    };
    var listIn = (set, select, field, ids, extra) =>
      chunks(ids, 20).reduce(
        (rows, part) => rows.concat(list(set, '$select=' + select + '&$filter=' + encodeURIComponent(anyOf(field, part) + (extra ? ' and ' + extra : '')))),
        [],
      );
    // Work-order children (incidents, notes, assets) inherit permissions through multi-level parent chains
    // (own resource → booking → work order → child). OData reads of such chains fail for portal users with a generic
    // Dataverse error (0x80040216); FetchXML is the workaround (see opportunity-workspace). Rows are still limited
    // by the caller's table permissions. Pages by number with the same bounds as list().
    var xmlValue = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    var fetchIn = (set, entity, attributes, field, ids, extraConditions) =>
      chunks(ids, 20).reduce((all, part) => {
        var key = primaryKeys[set];
        if (!key) throw new Error('Unsupported collection.');
        var filterXml =
          '<filter type="and">' +
          '<condition attribute="' + field + '" operator="in">' + part.map(id => '<value>' + xmlValue(id) + '</value>').join('') + '</condition>' +
          (extraConditions || []).map(c => '<condition attribute="' + c[0] + '" operator="eq" value="' + xmlValue(c[1]) + '"/>').join('') +
          '</filter>';
        var rows = [];
        for (var page = 1; page <= 20; page++) {
          step = step.split(' | ')[0] + ' | fetchXml ' + entity + ' page ' + page;
          var xml =
            '<fetch page="' + page + '" count="5000"><entity name="' + entity + '">' +
            attributes.map(a => '<attribute name="' + a + '"/>').join('') +
            filterXml +
            '<order attribute="' + key + '"/></entity></fetch>';
          var body = parse(Server.Connector.Dataverse.RetrieveMultipleRecords(set, 'fetchXml=' + encodeURIComponent(xml)));
          if (!Array.isArray(body.value) || body.value.some(row => !row || typeof row[key] !== 'string')) throw new Error('Invalid Dataverse collection.');
          rows = rows.concat(body.value);
          if (rows.length > 5000) throw new Error('The complete collection exceeds the read limit.');
          var more = body['@Microsoft.Dynamics.CRM.morerecords'];
          if (more !== true && more !== 'true') return all.concat(rows);
          if (!body.value.length) throw new Error('Invalid Dataverse continuation.');
        }
        throw new Error('Too many pages.');
      }, []);

    var WORK_ORDER_STATUS = { 690970000: 'Unscheduled', 690970001: 'Scheduled', 690970002: 'In Progress', 690970003: 'Completed', 690970004: 'Posted', 690970005: 'Canceled' };
    // bookingstatus.msdyn_fieldservicestatus (verified in PPCC-FO-2026).
    var BOOKING_STATUS = { 690970000: 'Scheduled', 690970001: 'Traveling', 690970002: 'On Break', 690970003: 'In Progress', 690970004: 'Completed', 690970005: 'Canceled' };
    var PURCHASE_ORDER_STATUS = { 690970000: 'Draft', 690970001: 'Submitted', 690970002: 'Canceled', 690970003: 'Products Received', 690970004: 'Billed' };
    var WO_SELECT =
      'msdyn_workorderid,msdyn_name,msdyn_systemstatus,_msdyn_serviceaccount_value,_msdyn_workordertype_value,' +
      '_msdyn_primaryincidenttype_value,msdyn_primaryincidentdescription,_msdyn_priority_value,_msdyn_servicerequest_value,' +
      '_msdyn_customerasset_value,_msdyn_reportedbycontact_value,msdyn_instructions,msdyn_workordersummary,msdyn_address1,' +
      'msdyn_address2,msdyn_city,msdyn_stateorprovince,msdyn_postalcode,msdyn_country,_cr798_servicepartnerid_value,createdon';
    var BOOKING_SELECT = 'bookableresourcebookingid,_msdyn_workorder_value,_resource_value,starttime,endtime,msdyn_actualarrivaltime,createdon,modifiedon';
    // Teammates' bookable resources aren't readable (own resource only), so the resource is identified by id and
    // its formatted name; booking statuses are global reference data.
    var BOOKING_EXPAND = '&$expand=BookingStatus($select=bookingstatusid,name,msdyn_fieldservicestatus,status)';

    step = 'me';
    var me = one('contacts', Server.User.contactid, '$select=contactid,_parentcustomerid_value');
    var partnerId = me._parentcustomerid_value;
    var requested = Server.Context.QueryParameters['id'];
    if (requested !== undefined && requested !== null && requested !== '' && !isGuid(requested)) {
      return JSON.stringify({ status: 'error', message: 'Enter a valid work order.' });
    }

    // 1. The caller's own bookable resources and their (non-canceled) bookings.
    step = '1-resources';
    var resources = list('bookableresources', '$select=bookableresourceid,name&$filter=' + encodeURIComponent('_contactid_value eq ' + Server.User.contactid));
    step = '1-my-bookings';
    var myBookings = resources.length
      ? listIn('bookableresourcebookings', BOOKING_SELECT + BOOKING_EXPAND, '_resource_value', resources.map(r => r.bookableresourceid), '_msdyn_workorder_value ne null').filter(
          b => !(b.BookingStatus && b.BookingStatus.msdyn_fieldservicestatus === 690970005),
        )
      : [];
    var myResourceIds = resources.map(r => r.bookableresourceid);
    var myWorkOrderIds = myBookings.map(b => b._msdyn_workorder_value).filter((v, i, a) => isGuid(v) && a.indexOf(v) === i);

    // 2. Work orders: booked to the caller, or subcontracted to the caller's partner organization.
    var scopes = [];
    if (isGuid(partnerId)) scopes.push('_cr798_servicepartnerid_value eq ' + partnerId);
    chunks(myWorkOrderIds, 20).forEach(part => scopes.push(anyOf('msdyn_workorderid', part)));
    if (!scopes.length) return JSON.stringify({ status: 'success', workOrders: [], bookings: [] });
    var filter = '(' + scopes.join(' or ') + ')';
    if (requested) filter = 'msdyn_workorderid eq ' + requested + ' and ' + filter;
    step = '2-work-orders';
    var workOrders = list('msdyn_workorders', '$select=' + WO_SELECT + '&$filter=' + encodeURIComponent(filter));
    var ids = workOrders.map(w => w.msdyn_workorderid);
    if (!ids.length) return JSON.stringify({ status: 'success', workOrders: [], bookings: [] });

    // 3. Related rows (each read is still limited by the child table permissions).
    step = '3-bookings';
    var bookings = chunks(ids, 20).reduce(
      (rows, part) =>
        rows.concat(list('bookableresourcebookings', '$select=' + BOOKING_SELECT + BOOKING_EXPAND + '&$filter=' + encodeURIComponent(anyOf('_msdyn_workorder_value', part)))),
      [],
    );
    step = '3-incidents';
    var incidents = fetchIn(
      'msdyn_workorderincidents',
      'msdyn_workorderincident',
      ['msdyn_workorderincidentid', 'msdyn_workorder', 'msdyn_incidenttype', 'msdyn_description', 'createdon'],
      'msdyn_workorder',
      ids,
      [['msdyn_name', 'Technician diagnosis']],
    );
    step = '3-notes';
    var notes = fetchIn('annotations', 'annotation', ['annotationid', 'objectid', 'subject', 'notetext', 'createdon'], 'objectid', ids, [['subject', 'Service report']]);
    var assetIds = workOrders.map(w => w._msdyn_customerasset_value).filter((v, i, a) => isGuid(v) && a.indexOf(v) === i);
    var assets = {};
    step = '3-assets';
    if (assetIds.length) {
      try {
        fetchIn(
          'msdyn_customerassets',
          'msdyn_customerasset',
          ['msdyn_customerassetid', 'msdyn_name', 'msdyn_assettag', 'msdyn_product', 'msdyn_functionallocation'],
          'msdyn_customerassetid',
          assetIds,
        ).forEach(a => {
          assets[a.msdyn_customerassetid] = a;
        });
      } catch (e) {
        // Asset details are optional: fall back to the lookup name on the work order.
        Server.Logger.Warn('technician-work-orders asset details unavailable: ' + e.message);
      }
    }
    // Purchase orders raised from a technician's service report (replacement part). Optional, like assets.
    step = '3-purchase-orders';
    var purchaseOrders = [];
    try {
      purchaseOrders = fetchIn(
        'msdyn_purchaseorders',
        'msdyn_purchaseorder',
        ['msdyn_purchaseorderid', 'msdyn_name', 'msdyn_workorder', 'msdyn_systemstatus', 'createdon'],
        'msdyn_workorder',
        ids,
      );
    } catch (e) {
      Server.Logger.Warn('technician-work-orders purchase orders unavailable: ' + e.message);
    }
    // The replacement-part catalog for the diagnosis picker (single work order only).
    var parts;
    if (requested) {
      step = '3-parts';
      parts = [];
      var family = String(Server.SiteSetting.Get('Technician/PurchaseOrder/PartsFamilyId') || '').trim();
      if (isGuid(family)) {
        try {
          parts = list(
            'products',
            '$select=productid,name,productnumber&$orderby=name&$filter=' + encodeURIComponent('statecode eq 0 and _parentproductid_value eq ' + family),
          ).map(p => ({ id: p.productid, name: p.name, number: p.productnumber || undefined }));
        } catch (e) {
          Server.Logger.Warn('technician-work-orders parts unavailable: ' + e.message);
        }
      } else Server.Logger.Warn('technician-work-orders: Technician/PurchaseOrder/PartsFamilyId is not configured.');
    }

    var latest = (rows, field, id) => rows.filter(r => r[field] === id).sort((a, b) => String(b.createdon).localeCompare(String(a.createdon)))[0];
    var section = (text, label, next) => {
      var start = text.indexOf(label + ':\n');
      if (start < 0) return '';
      var from = start + label.length + 2;
      var end = next ? text.indexOf('\n\n' + next + ':', from) : -1;
      return text.slice(from, end < 0 ? undefined : end).trim();
    };
    var line = (text, label) => {
      var m = new RegExp('^' + label + ': (.*)$', 'm').exec(text);
      return m ? m[1].trim() : '';
    };
    var bookingStatus = b => {
      var s = b.BookingStatus || {};
      if (BOOKING_STATUS[s.msdyn_fieldservicestatus]) return BOOKING_STATUS[s.msdyn_fieldservicestatus];
      return s.status === 3 ? 'Canceled' : 'Scheduled';
    };

    step = '4-projection';
    var outBookings = bookings.map(b => ({
      id: b.bookableresourcebookingid,
      workOrderId: b._msdyn_workorder_value,
      resourceContactId: myResourceIds.indexOf(b._resource_value) >= 0 ? Server.User.contactid : undefined,
      resourceName: formatted(b, '_resource_value') || 'Technician',
      status: bookingStatus(b),
      start: b.starttime,
      end: b.endtime,
      arrivedOn: b.msdyn_actualarrivaltime || undefined,
      assignedOn: b.modifiedon || b.createdon,
    }));

    var outWorkOrders = workOrders.map(w => {
      var id = w.msdyn_workorderid;
      var incident = latest(incidents, '_msdyn_workorder_value', id);
      var note = latest(notes, '_objectid_value', id);
      var asset = assets[w._msdyn_customerasset_value];
      var timeline = [{ id: id + ':created', at: w.createdon, text: 'Work order created', by: 'Zava' }];
      outBookings
        .filter(b => b.workOrderId === id)
        .forEach(b => {
          timeline.push({ id: b.id + ':booked', at: b.assignedOn, text: 'Booked for ' + b.resourceName, by: 'Zava dispatch' });
          if (b.arrivedOn) timeline.push({ id: b.id + ':arrived', at: b.arrivedOn, text: 'Arrived on site', by: b.resourceName });
        });
      var diagnosis;
      if (incident) {
        var text = String(incident.msdyn_description || '').replace(/\r\n/g, '\n');
        var part = line(text, 'Replacement part');
        // "Replacement part: <product name> [<product number>]"; older diagnoses hold free text.
        var partMatch = /^(.*?)\s*\[([^\]]+)\]$/.exec(part);
        diagnosis = {
          fault: line(text, 'Fault') || formatted(incident, '_msdyn_incidenttype_value') || 'Diagnosis',
          findings: section(text, 'Findings', 'Replacement part') || section(text, 'Findings'),
          partRequired: !!part,
          part: (partMatch ? partMatch[1] : part) || undefined,
          partNumber: partMatch ? partMatch[2] : undefined,
          recordedOn: incident.createdon,
          recordedBy: line(text, 'Recorded by'),
        };
        timeline.push({ id: incident.msdyn_workorderincidentid, at: incident.createdon, text: 'Diagnosis recorded: ' + diagnosis.fault, by: diagnosis.recordedBy });
      }
      var report;
      if (note) {
        var body = String(note.notetext || '').replace(/\r\n/g, '\n');
        report = {
          outcome: line(body, 'Outcome'),
          workPerformed: section(body, 'Work performed', 'Summary for the customer'),
          customerSummary: section(body, 'Summary for the customer') || w.msdyn_workordersummary || '',
          submittedOn: note.createdon,
          submittedBy: line(body, 'Submitted by'),
        };
        timeline.push({ id: note.annotationid, at: note.createdon, text: 'Service report submitted', by: report.submittedBy });
      }
      var po = latest(purchaseOrders, '_msdyn_workorder_value', id);
      var purchaseOrder;
      if (po) {
        purchaseOrder = {
          id: po.msdyn_purchaseorderid,
          number: po.msdyn_name,
          status: formatted(po, 'msdyn_systemstatus') || PURCHASE_ORDER_STATUS[po.msdyn_systemstatus] || 'Draft',
          part: diagnosis && diagnosis.part,
          createdOn: po.createdon,
        };
        timeline.push({ id: po.msdyn_purchaseorderid, at: po.createdon, text: 'Purchase order ' + po.msdyn_name + ' raised for the replacement part', by: 'Zava' });
      }
      return {
        id: id,
        number: w.msdyn_name,
        title: w.msdyn_primaryincidentdescription || formatted(w, '_msdyn_primaryincidenttype_value') || w.msdyn_name,
        customerName: formatted(w, '_msdyn_serviceaccount_value') || 'Customer',
        address: {
          line1: w.msdyn_address1 || undefined,
          line2: w.msdyn_address2 || undefined,
          city: w.msdyn_city || undefined,
          state: w.msdyn_stateorprovince || undefined,
          postalCode: w.msdyn_postalcode || undefined,
          country: w.msdyn_country || undefined,
        },
        siteContact: w._msdyn_reportedbycontact_value ? { name: formatted(w, '_msdyn_reportedbycontact_value') } : undefined,
        priority: formatted(w, '_msdyn_priority_value') || 'Normal',
        type: formatted(w, '_msdyn_workordertype_value'),
        incidentType: formatted(w, '_msdyn_primaryincidenttype_value'),
        caseNumber: formatted(w, '_msdyn_servicerequest_value'),
        asset: w._msdyn_customerasset_value
          ? {
              name: (asset && asset.msdyn_name) || formatted(w, '_msdyn_customerasset_value'),
              model: asset ? formatted(asset, '_msdyn_product_value') : undefined,
              serialNumber: (asset && asset.msdyn_assettag) || undefined,
              location: asset ? formatted(asset, '_msdyn_functionallocation_value') : undefined,
            }
          : undefined,
        instructions: w.msdyn_instructions || undefined,
        servicePartnerId: w._cr798_servicepartnerid_value || undefined,
        systemStatus: WORK_ORDER_STATUS[w.msdyn_systemstatus] || 'Scheduled',
        diagnosis: diagnosis,
        report: report,
        purchaseOrder: purchaseOrder,
        timeline: timeline.filter(e => e.at),
        createdOn: w.createdon,
      };
    });

    return JSON.stringify({ status: 'success', workOrders: outWorkOrders, bookings: outBookings, parts: parts });
  } catch (err) {
    Server.Logger.Error('technician-work-orders GET failed at [' + step + ']: ' + err.message);
    return JSON.stringify({ status: 'error', message: 'Work orders could not be loaded. Try again.' });
  }
}
