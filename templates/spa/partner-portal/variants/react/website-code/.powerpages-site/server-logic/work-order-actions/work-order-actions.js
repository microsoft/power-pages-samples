// Server Logic: work-order-actions
// Purpose: Validate-and-execute writes for the Partner Technician web role. Every rule is re-checked from Dataverse;
//          nothing about the caller is taken from the request body. The booking must belong to the caller's own
//          bookable resource and to the given work order, and the work order must still be open.
//          POST { action: "travel",   workOrderId, bookingId }                                   Scheduled → Traveling
//          POST { action: "arrive",   workOrderId, bookingId }                                   Traveling → In Progress
//          POST { action: "diagnose", workOrderId, bookingId, fault, findings, partRequired, partId } on site
//          POST { action: "report",   workOrderId, bookingId, workPerformed, outcome, customerSummary } on site → Completed
//          When the diagnosis needs a replacement part, "report" first raises one Draft purchase order (msdyn_purchaseorder)
//          with one line (msdyn_purchaseorderproduct) for the visit, once per booking. Vendor, receiving warehouse,
//          currency and the replacement-part product family come from Technician/PurchaseOrder/* site settings.
// API URL: https://<site-url>/_api/serverlogics/work-order-actions

function post() {
  // Step tracing: the failing step is written to the server log alongside the error.
  var step = 'start';
  var mark = name => {
    step = name;
    Server.Logger.Log('work-order-actions step: ' + name);
  };
  try {
    Server.Logger.Log('work-order-actions POST called');
    if (!Server.User || !Server.User.contactid) throw new Error('Authentication required.');

    var parse = (response, allowEmpty) => {
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
    var one = (set, id, query) => parse(Server.Connector.Dataverse.RetrieveRecord(set, id, String(query || '').replace(/^\?/, ''), true));
    var many = (set, query) => {
      var body = parse(Server.Connector.Dataverse.RetrieveMultipleRecords(set, String(query || '').replace(/^\?/, '')));
      if (!Array.isArray(body.value)) throw new Error('Invalid Dataverse collection.');
      return body.value;
    };
    // Filtered collection reads, as in technician-work-orders; rows are still limited by the caller's table permissions.
    var oneBy = (set, key, id, query) => {
      var rows = many(set, String(query || '').replace(/^\?/, '') + '&$filter=' + encodeURIComponent(key + ' eq ' + id) + '&$top=2');
      return rows.length === 1 && same(rows[0][key], id) ? rows[0] : null;
    };
    var update = (set, id, payload) => parse(Server.Connector.Dataverse.UpdateRecord(set, id, JSON.stringify(payload)), true);
    var create = (set, payload) => parse(Server.Connector.Dataverse.CreateRecord(set, JSON.stringify(payload)), true);
    var isGuid = v => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
    var same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
    var deny = message => JSON.stringify({ status: 'error', method: 'POST', message: message || "You can't update this work order. Refresh the page and try again." });
    var ok = extra => JSON.stringify(Object.assign({ status: 'success' }, extra || {}));
    var text = (v, max) => (typeof v === 'string' ? v.trim() : '').slice(0, max);
    var setting = name => String(Server.SiteSetting.Get(name) || '').trim();
    var newId = () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = Math.floor(Math.random() * 16);
        return (c === 'x' ? r : (r % 4) + 8).toString(16);
      });

    // bookingstatus.msdyn_fieldservicestatus (verified in PPCC-FO-2026).
    // Don't name this FS: the restricted-pattern check is case-insensitive and blocks the Node file-system prefix.
    var FIELD_STATUS = { scheduled: 690970000, traveling: 690970001, onBreak: 690970002, inProgress: 690970003, completed: 690970004, canceled: 690970005 };
    var CLOSED_WORK_ORDER = [690970003, 690970004, 690970005]; // Completed, Posted, Canceled
    var FAULTS = ['Compressor failure', 'Refrigerant leak', 'Controller fault', 'Fan motor failure', 'Sensor fault', 'No fault found'];
    var OUTCOMES = ['Resolved', 'Follow-up visit needed'];
    var DIAGNOSIS_NAME = 'Technician diagnosis';

    var input = JSON.parse(Server.Context.Body || '{}');
    if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('Enter valid work order details.');
    mark('input');
    if (['travel', 'arrive', 'diagnose', 'report'].indexOf(input.action) < 0) return deny('Unknown request.');
    if (!isGuid(input.workOrderId) || !isGuid(input.bookingId)) return deny('Enter a valid work order.');

    mark('contact');
    var me = one('contacts', Server.User.contactid, '$select=contactid,fullname,statecode');
    if (me.statecode !== 0) return deny();

    // The booking must be on the caller's own bookable resource and belong to this work order.
    mark('booking');
    var booking = oneBy(
      'bookableresourcebookings',
      'bookableresourcebookingid',
      input.bookingId,
      '$select=bookableresourcebookingid,_msdyn_workorder_value,_resource_value&$expand=BookingStatus($select=msdyn_fieldservicestatus)',
    );
    if (!booking || !same(booking._msdyn_workorder_value, input.workOrderId)) return deny();
    mark('resource');
    var resource = oneBy('bookableresources', 'bookableresourceid', booking._resource_value, '$select=bookableresourceid,_contactid_value');
    if (!resource || !same(resource._contactid_value, Server.User.contactid)) return deny('Only the assigned technician can update this visit.');
    mark('workOrder');
    var workOrder = oneBy('msdyn_workorders', 'msdyn_workorderid', input.workOrderId, '$select=msdyn_workorderid,msdyn_name,msdyn_systemstatus,_msdyn_primaryincidenttype_value');
    if (!workOrder) return deny();
    if (CLOSED_WORK_ORDER.indexOf(workOrder.msdyn_systemstatus) >= 0) return deny('This work order is closed.');
    var current = booking.BookingStatus ? booking.BookingStatus.msdyn_fieldservicestatus : undefined;
    var onSite = current === FIELD_STATUS.inProgress || current === FIELD_STATUS.onBreak;

    var statusRecord = fieldServiceStatus => {
      mark('statusLookup');
      var rows = many('bookingstatuses', '$select=bookingstatusid,name&$filter=' + encodeURIComponent('statecode eq 0 and msdyn_fieldservicestatus eq ' + fieldServiceStatus) + '&$orderby=name');
      if (!rows.length) throw new Error('Booking status not configured.');
      return rows[0].bookingstatusid;
    };
    var setStatus = (fieldServiceStatus, extra) => {
      var statusId = statusRecord(fieldServiceStatus);
      var payload = { 'BookingStatus@odata.bind': '/bookingstatuses(' + statusId + ')' };
      Object.keys(extra || {}).forEach(k => {
        payload[k] = extra[k];
      });
      mark('bookingUpdate');
      update('bookableresourcebookings', input.bookingId, payload);
    };
    // Incidents inherit permissions through multi-level parent chains (own resource → booking → work order → incident).
    // OData reads of such chains fail for portal users with a generic Dataverse error; FetchXML is the workaround.
    var existingDiagnosis = () => {
      var xml =
        '<fetch top="1"><entity name="msdyn_workorderincident"><attribute name="msdyn_workorderincidentid"/><attribute name="msdyn_description"/><attribute name="createdon"/>' +
        '<filter type="and"><condition attribute="msdyn_workorder" operator="eq" value="' + input.workOrderId + '"/>' +
        '<condition attribute="msdyn_name" operator="eq" value="' + DIAGNOSIS_NAME + '"/></filter>' +
        '<order attribute="createdon" descending="true"/></entity></fetch>';
      return many('msdyn_workorderincidents', 'fetchXml=' + encodeURIComponent(xml))[0];
    };
    // Replacement parts are active products in the configured product family.
    var PRODUCT_SELECT = '$select=productid,name,productnumber,_defaultuomid_value,_parentproductid_value,statecode,currentcost,standardcost,price';
    // Unit cost for the order line: the product's cost, else its list price (the Supplier portal needs a number).
    var unitCost = product => [product.currentcost, product.standardcost, product.price].filter(v => typeof v === 'number' && v >= 0)[0];
    var replacementPart = product => {
      var family = setting('Technician/PurchaseOrder/PartsFamilyId');
      if (!isGuid(family)) throw new Error('Technician/PurchaseOrder/PartsFamilyId is not configured.');
      return product && product.statecode === 0 && same(product._parentproductid_value, family) && product.productnumber ? product : null;
    };
    // One Draft purchase order per work order and part (a follow-up visit to fit the part doesn't order it again),
    // with one line. Re-running the report completes a partially created order instead of raising a second one.
    var ensurePurchaseOrder = partNumber => {
      mark('report:purchaseOrderSettings');
      var cfg = {
        vendor: setting('Technician/PurchaseOrder/VendorId'),
        warehouse: setting('Technician/PurchaseOrder/WarehouseId'),
        currency: setting('Technician/PurchaseOrder/CurrencyId'),
        // The Zava Supplier portal lists orders assigned to its supplier Contact and validates these supplier fields
        // against the supplier's other orders, so they must match the existing Northwind orders exactly.
        supplierContact: setting('Technician/PurchaseOrder/SupplierContactId'),
        supplierName: setting('Technician/PurchaseOrder/SupplierName'),
        vendorAccount: setting('Technician/PurchaseOrder/VendorAccount'),
        dataAreaId: setting('Technician/PurchaseOrder/DataAreaId'),
        currencyCode: setting('Technician/PurchaseOrder/CurrencyCode'),
      };
      if (
        !isGuid(cfg.vendor) ||
        !isGuid(cfg.warehouse) ||
        !isGuid(cfg.currency) ||
        !isGuid(cfg.supplierContact) ||
        !cfg.supplierName ||
        !cfg.vendorAccount ||
        !cfg.dataAreaId ||
        !/^[A-Z]{3}$/.test(cfg.currencyCode)
      )
        throw new Error('Technician/PurchaseOrder settings are not configured.');
      mark('report:purchaseOrderProduct');
      var product = replacementPart(
        many('products', PRODUCT_SELECT + '&$filter=' + encodeURIComponent("productnumber eq '" + partNumber.replace(/'/g, "''") + "'") + '&$top=1')[0],
      );
      if (!product || !isGuid(product._defaultuomid_value)) throw new Error('Replacement part ' + partNumber + ' is not an active part with a default unit.');
      var cost = unitCost(product);
      if (cost === undefined) throw new Error('Replacement part ' + partNumber + ' has no cost or list price.');
      mark('report:purchaseOrderOrdered');
      var ordered = many(
        'msdyn_purchaseorderproducts',
        'fetchXml=' +
          encodeURIComponent(
            '<fetch top="1"><entity name="msdyn_purchaseorderproduct"><attribute name="msdyn_purchaseorder"/>' +
              '<filter type="and"><condition attribute="msdyn_associatetoworkorder" operator="eq" value="' + input.workOrderId + '"/>' +
              '<condition attribute="msdyn_product" operator="eq" value="' + product.productid + '"/></filter></entity></fetch>',
          ),
      )[0];
      if (ordered) {
        var orderedNumber = ordered['_msdyn_purchaseorder_value@OData.Community.Display.V1.FormattedValue'] || 'PO-WO-' + workOrder.msdyn_name;
        Server.Logger.Log('work-order-actions ' + product.productnumber + ' already ordered on ' + orderedNumber);
        return { id: ordered._msdyn_purchaseorder_value, number: orderedNumber, part: product.name };
      }
      mark('report:purchaseOrderExisting');
      var existing = many(
        'msdyn_purchaseorders',
        'fetchXml=' +
          encodeURIComponent(
            '<fetch top="1"><entity name="msdyn_purchaseorder"><attribute name="msdyn_purchaseorderid"/><attribute name="msdyn_name"/>' +
              '<filter type="and"><condition attribute="msdyn_workorder" operator="eq" value="' + input.workOrderId + '"/>' +
              '<condition attribute="msdyn_booking" operator="eq" value="' + input.bookingId + '"/></filter></entity></fetch>',
          ),
      )[0];
      var po = existing ? { id: existing.msdyn_purchaseorderid, number: existing.msdyn_name } : { id: newId(), number: 'PO-WO-' + workOrder.msdyn_name };
      var currency = '/transactioncurrencies(' + cfg.currency + ')';
      var warehouse = '/msdyn_warehouses(' + cfg.warehouse + ')';
      if (!existing) {
        mark('report:purchaseOrder');
        create('msdyn_purchaseorders', {
          msdyn_purchaseorderid: po.id,
          msdyn_name: po.number,
          msdyn_purchaseorderdate: new Date().toISOString().slice(0, 10),
          msdyn_purchaseordername: product.name,
          msdyn_vendororderreference: 'Work order ' + workOrder.msdyn_name,
          zava_suppliername: cfg.supplierName,
          zava_vendoraccount: cfg.vendorAccount,
          zava_dataareaid: cfg.dataAreaId,
          zava_currencycode: cfg.currencyCode,
          zava_urgent: false,
          'msdyn_ContactPersonId@odata.bind': '/contacts(' + cfg.supplierContact + ')',
          'msdyn_vendor@odata.bind': '/accounts(' + cfg.vendor + ')',
          'msdyn_receivetowarehouse@odata.bind': warehouse,
          'msdyn_workorder@odata.bind': '/msdyn_workorders(' + input.workOrderId + ')',
          'msdyn_booking@odata.bind': '/bookableresourcebookings(' + input.bookingId + ')',
          'transactioncurrencyid@odata.bind': currency,
        });
      }
      mark('report:purchaseOrderLine');
      create('msdyn_purchaseorderproducts', {
        msdyn_name: product.name,
        msdyn_description: product.name + ' for work order ' + workOrder.msdyn_name,
        msdyn_quantity: 1,
        msdyn_lineorder: 1,
        msdyn_unitcost: cost,
        msdyn_totalcost: cost,
        zava_supplieraccepted: false,
        'msdyn_purchaseorder@odata.bind': '/msdyn_purchaseorders(' + po.id + ')',
        'msdyn_product@odata.bind': '/products(' + product.productid + ')',
        'msdyn_unit@odata.bind': '/uoms(' + product._defaultuomid_value + ')',
        'msdyn_associatetowarehouse@odata.bind': warehouse,
        'msdyn_associatetoworkorder@odata.bind': '/msdyn_workorders(' + input.workOrderId + ')',
        'msdyn_associatetobooking@odata.bind': '/bookableresourcebookings(' + input.bookingId + ')',
        'transactioncurrencyid@odata.bind': currency,
      });
      Server.Logger.Log('work-order-actions purchase order ' + po.number + (existing ? ' already existed' : ' created') + ' for ' + product.productnumber);
      return { id: po.id, number: po.number, part: product.name };
    };

    if (input.action === 'travel') {
      if (current !== FIELD_STATUS.scheduled) return deny('This visit has already started.');
      setStatus(FIELD_STATUS.traveling);
      return ok();
    }

    if (input.action === 'arrive') {
      if (current !== FIELD_STATUS.traveling) return deny('Start travel before recording your arrival.');
      setStatus(FIELD_STATUS.inProgress, { msdyn_actualarrivaltime: new Date().toISOString() });
      return ok();
    }

    if (input.action === 'diagnose') {
      if (!onSite) return deny('Record your arrival before the diagnosis.');
      var fault = text(input.fault, 100);
      var findings = text(input.findings, 4000);
      var partRequired = input.partRequired === true;
      if (FAULTS.indexOf(fault) < 0) return deny('Select the fault you found.');
      if (!findings) return deny('Describe what you found.');
      var part = null;
      if (partRequired) {
        if (!isGuid(input.partId)) return deny('Select the replacement part.');
        mark('diagnose:part');
        part = replacementPart(oneBy('products', 'productid', input.partId, PRODUCT_SELECT));
        if (!part) return deny('Select a replacement part from the list.');
      }
      var description =
        'Fault: ' +
        fault +
        '\n' +
        (part ? 'Replacement part: ' + part.name + ' [' + part.productnumber + ']\n' : '') +
        'Recorded by: ' +
        me.fullname +
        '\n\nFindings:\n' +
        findings;
      mark('diagnose:incidentType');
      var typed = many('msdyn_incidenttypes', '$select=msdyn_incidenttypeid&$filter=' + encodeURIComponent("statecode eq 0 and msdyn_name eq '" + fault.replace(/'/g, "''") + "'") + '&$top=1')[0];
      var incidentType = typed ? typed.msdyn_incidenttypeid : workOrder._msdyn_primaryincidenttype_value;
      if (!isGuid(incidentType)) return deny('No incident type is configured for this fault. Contact Zava dispatch.');
      var payload = { msdyn_description: description, 'msdyn_incidenttype@odata.bind': '/msdyn_incidenttypes(' + incidentType + ')' };
      mark('diagnose:existing');
      var previous = existingDiagnosis();
      mark('diagnose:write');
      if (previous) update('msdyn_workorderincidents', previous.msdyn_workorderincidentid, payload);
      else {
        payload.msdyn_name = DIAGNOSIS_NAME;
        payload['msdyn_workorder@odata.bind'] = '/msdyn_workorders(' + input.workOrderId + ')';
        create('msdyn_workorderincidents', payload);
      }
      return ok();
    }

    // report
    if (!onSite) return deny('Record your arrival before submitting the service report.');
    mark('report:existing');
    var diagnosis = existingDiagnosis();
    if (!diagnosis) return deny('Record your diagnosis before submitting the service report.');
    var outcome = text(input.outcome, 50);
    var workPerformed = text(input.workPerformed, 4000);
    var customerSummary = text(input.customerSummary, 2000);
    if (OUTCOMES.indexOf(outcome) < 0) return deny('Select the outcome of the visit.');
    if (!workPerformed || !customerSummary) return deny('Complete the service report.');
    // Raise the purchase order before anything completes the visit, so a failure leaves the visit open to retry.
    var partLine = /^Replacement part: .*\[([^\]\r\n]+)\]\s*$/m.exec(String(diagnosis.msdyn_description || ''));
    var purchaseOrder = partLine ? ensurePurchaseOrder(partLine[1].trim()) : undefined;
    mark('report:workOrderSummary');
    update('msdyn_workorders', input.workOrderId, { msdyn_workordersummary: customerSummary });
    mark('report:note');
    create('annotations', {
      subject: 'Service report',
      notetext:
        'Outcome: ' + outcome + '\nSubmitted by: ' + me.fullname + '\n\nWork performed:\n' + workPerformed + '\n\nSummary for the customer:\n' + customerSummary,
      'objectid_msdyn_workorder@odata.bind': '/msdyn_workorders(' + input.workOrderId + ')',
    });
    // Completing the booking lets Field Service roll the work order status forward.
    setStatus(FIELD_STATUS.completed);
    if (outcome === 'Follow-up visit needed') {
      // Keep the work order open for Zava dispatch to book the next visit (Field Service may have completed it).
      try {
        update('msdyn_workorders', input.workOrderId, { msdyn_systemstatus: 690970000 });
      } catch (e) {
        Server.Logger.Warn('work-order-actions could not reopen work order for follow-up: ' + e.message);
      }
    }
    return ok(purchaseOrder ? { purchaseOrder: purchaseOrder } : undefined);
  } catch (err) {
    var detail = err && err.message ? err.message : String(err);
    Server.Logger.Error('work-order-actions POST failed at [' + step + ']: ' + detail);
    return JSON.stringify({
      status: 'error',
      method: 'POST',
      message: 'The change could not be saved. Refresh the page and try again.',
    });
  }
}
