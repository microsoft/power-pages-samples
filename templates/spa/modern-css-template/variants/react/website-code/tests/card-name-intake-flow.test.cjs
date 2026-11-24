const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const flow = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'integrations', 'case-management', 'card-name-intake-flow.json'), 'utf8'))
const definition = flow.properties.definition
const actions = definition.actions
const continuation = actions.Continuation_receipt_exists.else.actions
const portalUserParameter = 'Modern CSS - Portal application user ID (ppst_ModernCss_PortalApplicationUserId)'
const portalUser = '11111111-1111-4111-8111-111111111111'
const caseId = '22222222-2222-4222-8222-222222222222'
const commentId = '33333333-3333-4333-8333-333333333333'
const noteId = '44444444-4444-4444-8444-444444444444'
const contactId = '55555555-5555-4555-8555-555555555555'
const intentId = '527277fa-b1de-f111-84e8-00224809f672'
const familyId = '14f7c663-ed81-46d4-8cec-4cb1432bce57'
const receiptSubject = 'Support portal: Card name intake continuation'

function fixture() {
  return {
    annotation: {
      annotationid: noteId, notetext: '*WEB* Customer-uploaded document', isdocument: true,
      filesize: 20, filename: 'synthetic.pdf', mimetype: 'application/pdf',
      _createdby_value: portalUser, _objectid_value: commentId,
    },
    comment: {
      activityid: commentId, subject: 'Customer document uploaded', adx_portalcommentdirectioncode: 1,
      description: 'Attachment uploaded: synthetic.pdf\nDocument reference: ' + noteId,
      _createdby_value: portalUser, _regardingobjectid_value: caseId, regardingobjectid_incident_adx_portalcomment: { incidentid: caseId },
    },
    case: {
      incidentid: caseId, caseorigincode: 3, statecode: 0, _createdby_value: portalUser,
      _customerid_value: contactId, customerid_contact: { contactid: contactId },
    },
    classifications: [{
      msdyn_intententityid: noteId, _msdyn_objectid_value: caseId, _msdyn_intentid_value: intentId,
      _msdyn_intentfamilyid_value: familyId, statecode: 0,
    }],
    intent: {
      msdyn_intentid: intentId, msdyn_reviewstate: 192350001, msdyn_is_selfserve_enabled: true,
      statecode: 0, _msdyn_intentfamilyid_value: familyId,
    },
    settings: { isEnabled: true, isShadowMode: false, resolution: { isEnabled: true, automationLevel: 'Full' } },
    receipts: [],
  }
}

// Evaluate the actual WDL subset used by the checked-in guards and connector inputs,
// rather than keeping a second implementation of the eligibility rules.
function evaluate(value, context) {
  if (typeof value !== 'string' || !value.startsWith('@')) return value
  const source = value.slice(1)
  let offset = 0
  const functions = {
    outputs: name => context.outputs[name], parameters: name => context.parameters[name],
    triggerBody: () => context.trigger,
    equals: (a, b) => a === b, not: value => !value,
    if: (condition, yes, no) => condition ? yes : no,
    coalesce: (...values) => values.find(value => value !== null && value !== undefined) ?? null,
    empty: value => value == null || value === '' || (Array.isArray(value) && value.length === 0),
    json: value => JSON.parse(value), length: value => value.length,
    concat: (...values) => values.join(''), toLower: value => value.toLowerCase(),
    endsWith: (value, suffix) => value.endsWith(suffix),
    split: (value, separator) => value.split(separator), last: value => value.at(-1), trim: value => value.trim(),
    startsWith: (value, prefix) => value.startsWith(prefix), contains: (value, part) => value.includes(part),
    and: (...values) => values.every(Boolean), or: (...values) => values.some(Boolean),
    variables: name => context.variables[name], body: name => context.outputs[name]?.body,
    item: () => context.item, workflow: () => ({ run: { name: 'test-run' } }),
    join: (values, separator) => values.join(separator), createArray: (...values) => values,
    string: value => typeof value === 'string' ? value : JSON.stringify(value),
    indexOf: (value, part) => value.indexOf(part), lastIndexOf: (value, part) => value.lastIndexOf(part),
    substring: (value, start, length) => { if (length < 0) throw new Error('Negative substring length'); return value.substr(start, length) },
    add: (a, b) => a + b, sub: (a, b) => a - b,
  }
  function whitespace() { while (/\s/.test(source[offset] ?? '') && offset < source.length) offset++ }
  function quoted() {
    assert.equal(source[offset++], "'")
    let result = ''
    while (offset < source.length) {
      if (source[offset] === "'") {
        offset++
        if (source[offset] !== "'") return result
      }
      result += source[offset++]
    }
    throw new Error('Unterminated WDL string')
  }
  function expression() {
    whitespace()
    let result
    if (source[offset] === "'") result = quoted()
    else {
      const token = source.slice(offset).match(/^(?:[A-Za-z_][A-Za-z_0-9]*|-?\d+)/)?.[0]
      assert.ok(token, `Unsupported expression at ${source.slice(offset)}`)
      offset += token.length
      if (token === 'true' || token === 'false') result = token === 'true'
      else if (token === 'null') result = null
      else if (/^-?\d+$/.test(token)) result = Number(token)
      else {
        assert.equal(source[offset++], '(')
        const args = []
        whitespace()
        if (source[offset] !== ')') {
          while (true) {
            args.push(expression())
            whitespace()
            if (source[offset] !== ',') break
            offset++
          }
        }
        assert.equal(source[offset++], ')')
        assert.ok(functions[token], `Unsupported WDL function ${token}`)
        result = functions[token](...args)
      }
    }
    while (source.slice(offset, offset + 2) === '?[') {
      offset += 2
      const key = quoted()
      assert.equal(source[offset++], ']')
      result = key.split('/').reduce((item, part) => item?.[part], result)
    }
    return result
  }
  const result = expression()
  whitespace()
  assert.equal(offset, source.length, `Unparsed WDL: ${source.slice(offset)}`)
  return result
}
// Resolve whole-value expressions ("@expr") and string interpolation ("text @{expr} text"), recursively.
function resolve(value, context) {
  if (Array.isArray(value)) return value.map(entry => resolve(entry, context))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolve(entry, context)]))
  if (typeof value !== 'string') return value
  if (value.startsWith('@') && !value.startsWith('@{')) return evaluate(value, context)
  let result = '', offset = 0
  while (offset < value.length) {
    const start = value.indexOf('@{', offset)
    if (start < 0) { result += value.slice(offset); break }
    result += value.slice(offset, start)
    let end = start + 2, quoted = false
    while (end < value.length && (quoted || value[end] !== '}')) { if (value[end] === "'") quoted = !quoted; end++ }
    const inner = evaluate('@' + value.slice(start + 2, end), context)
    result += typeof inner === 'string' ? inner : JSON.stringify(inner)
    offset = end + 1
  }
  return result
}
function predicate(expression, context) {
  const [operator, args] = Object.entries(expression)[0]
  if (operator === 'and') return args.every(value => predicate(value, context))
  if (operator === 'or') return args.some(value => predicate(value, context))
  if (operator === 'not') return !predicate(args, context)
  const [left, right] = args.map(value => evaluate(value, context))
  if (operator === 'equals') return left === right
  if (operator === 'greater') return left > right
  if (operator === 'lessOrEquals') return left <= right
  if (operator === 'startsWith') return String(left).startsWith(right)
  if (operator === 'contains') return String(left).includes(right)
  throw new Error(`Unsupported WDL operator ${operator}`)
}
function filterRows(rows, filter) {
  const clauses = filter.split(' and ').map(clause => {
    const match = clause.match(/^(\w+) eq (.+)$/)
    assert.ok(match, `Unsupported OData filter ${clause}`)
    const [, field, literal] = match
    const value = literal.startsWith("'") ? literal.slice(1, -1).replaceAll("''", "'")
      : literal === 'false' ? false : literal === 'true' ? true : /^\d+$/.test(literal) ? Number(literal) : literal
    return row => row[field] === value
  })
  return rows.filter(row => clauses.every(clause => clause(row)))
}
function run(data, options = {}) {
  const context = { outputs: {}, variables: {}, parameters: { [portalUserParameter]: portalUser }, trigger: { activityid: commentId, ...options.trigger } }
  const verifierResponse = options.verifier ?? JSON.stringify({ valid: true, verificationAvailable: true, documentType: 'passport', nameMatches: true, reasons: [] })
  const calls = [], statuses = {}
  let status = 'Succeeded', error
  function markSkipped(action) {
    for (const scope of [action.actions, action.else?.actions]) {
      for (const [inner, nested] of Object.entries(scope ?? {})) {
        if (!(inner in statuses)) statuses[inner] = 'Skipped'
        markSkipped(nested)
      }
    }
  }
  function execute(scope) {
    const pending = Object.entries(scope)
    while (pending.length) {
      const index = pending.findIndex(([, action]) => Object.keys(action.runAfter ?? {}).every(dependency => dependency in statuses))
      assert.ok(index >= 0, `Unresolvable runAfter for ${pending.map(([name]) => name).join(', ')}`)
      const [[name, action]] = pending.splice(index, 1)
      context.order = [...(context.order ?? []), name]
      if (!Object.entries(action.runAfter ?? {}).every(([dependency, allowed]) => allowed.includes(statuses[dependency]))) {
        statuses[name] = 'Skipped'
        markSkipped(action)
        continue
      }
      if (action.type === 'Terminate') {
        status = action.inputs.runStatus
        error = action.inputs.runError?.code
        throw { terminated: true }
      }
      if (action.type === 'If') {
        const branch = predicate(action.expression, context) ? action.actions : action.else.actions
        execute(branch)
        markSkipped({ actions: action.actions, else: action.else })
        statuses[name] = Object.keys(branch).some(inner => ['Failed', 'TimedOut'].includes(statuses[inner])) ? 'Failed' : 'Succeeded'
        continue
      }
      if (['InitializeVariable', 'SetVariable', 'Compose', 'Wait', 'Query'].includes(action.type)) {
        if (options.fail?.[name]) { statuses[name] = options.fail[name]; continue }
        try {
          if (action.type === 'InitializeVariable') for (const variable of action.inputs.variables) context.variables[variable.name] = resolve(variable.value, context)
          if (action.type === 'SetVariable') context.variables[action.inputs.name] = resolve(action.inputs.value, context)
          if (action.type === 'Compose') context.outputs[name] = resolve(action.inputs, context)
          if (action.type === 'Query') context.outputs[name] = { body: (resolve(action.inputs.from, context) ?? []).filter(row => { context.item = row; return resolve(action.inputs.where, context) }) }
        } catch (failure) {
          // Runtime expression errors (bad JSON, negative substring) fail the action, as in Logic Apps.
          if (failure instanceof assert.AssertionError) throw failure
          statuses[name] = 'Failed'
          continue
        }
        statuses[name] = 'Succeeded'
        continue
      }
      const parameters = resolve(action.inputs.parameters, context)
      const operation = action.inputs.host.operationId
      calls.push({ name, operation, parameters })
      if (options.fail?.[name]) { statuses[name] = options.fail[name]; continue }
      let body
      if (operation === 'ExecuteCopilotAsyncV2') {
        body = { lastResponse: verifierResponse }
      } else if (operation === 'GetItem') {
        body = { annotations: data.annotation, adx_portalcomments: data.comment, incidents: data.case, msdyn_intents: data.intent }[parameters.entityName]
        const primaryKey = { annotations: 'annotationid', adx_portalcomments: 'activityid', incidents: 'incidentid', msdyn_intents: 'msdyn_intentid' }[parameters.entityName]
        // A hostile fixture can model an unexpected/mismatched connector response;
        // the source guards must still reject it.
        assert.ok(parameters.recordId, `Read ${name} must have a trusted record ID`)
        assert.ok(body[primaryKey])
      } else if (operation === 'ListRecords') {
        const rows = parameters.entityName === 'annotations' ? data.receipts : data.classifications
        body = { value: filterRows(rows, parameters.$filter).slice(0, parameters.$top) }
      } else if (operation === 'PerformUnboundAction') {
        body = parameters.actionName === 'msdyn_GetCaseManagementAgentSettings'
          ? { Result: typeof data.settings === 'string' ? data.settings : JSON.stringify(data.settings) } : {}
      } else if (operation === 'CreateRecord') {
        const annotationid = `77777777-7777-4777-8777-${String(data.receipts.length + 1).padStart(12, '0')}`
        data.receipts.push({
          annotationid, _objectid_value: caseId, isdocument: parameters['item/isdocument'],
          subject: parameters['item/subject'], notetext: parameters['item/notetext'],
        })
        body = { annotationid }
      } else if (operation === 'UpdateOnlyRecord') {
        const receipt = data.receipts.find(row => row.annotationid === parameters.recordId)
        assert.ok(receipt, `Update ${name} must address the created receipt`)
        receipt.notetext = parameters['item/notetext']
        body = {}
      } else throw new Error(`Unsupported connector ${operation}`)
      context.outputs[name] = { body, statusCode: name === 'Invoke_card_name_intake_continuation' ? options.ack ?? 204 : 200 }
      statuses[name] = 'Succeeded'
    }
  }
  try {
    execute(actions)
    if (Object.values(statuses).some(value => value === 'Failed' || value === 'TimedOut')) status = 'Failed'
  } catch (failure) {
    if (!failure.terminated) { status = 'Failed'; error = failure.message }
  }
  return { status, error, calls, statuses, context }
}
const invokes = result => result.calls.filter(call => call.parameters.actionName === 'msdyn_invokeCaseProcessingAgent')
const writes = result => result.calls.filter(call => ['CreateRecord', 'UpdateOnlyRecord'].includes(call.operation))

test('metadata-only intake accepts matched formats and size boundaries then acknowledges, not confirms resolution', () => {
  for (const [filename, mimetype, filesize] of [
    ['proof.PDF', 'application/pdf', 1], ['proof.png', 'image/png', 5242880],
    ['proof.jpg', 'image/jpeg', 20], ['proof.JPEG', 'image/jpeg', 20],
  ]) {
    const data = fixture()
    Object.assign(data.annotation, { filename, mimetype, filesize })
    const result = run(data, { trigger: { subject: 'untrusted trigger claim', description: 'Document reference: ' + contactId } })
    assert.equal(result.status, 'Succeeded', result.error)
    assert.equal(invokes(result).length, 2)
    assert.match(data.receipts[0].notetext, /accepted.*acknowledgement only.*not a resolution confirmation/)
    assert.ok(writes(result).every(call => call.parameters.entityName === 'annotations'))
    assert.ok(result.calls.every(call => !('documentbody' in call.parameters) && !('item/documentbody' in call.parameters)))
  }
})

test('ordinary, forged, empty, oversized and wrong-type attachment metadata cannot reserve or invoke', () => {
  for (const patch of [
    { notetext: '*WEB* identity verified' }, { notetext: null },
    { _createdby_value: contactId }, { isdocument: false },
    { filesize: 0 }, { filesize: null }, { filesize: 5242881 },
    { filename: 'proof.exe' }, { filename: null }, { filename: 'proof.png', mimetype: 'application/pdf' },
    { mimetype: 'text/plain' },
    { _objectid_value: caseId }, { annotationid: contactId },
  ]) {
    const data = fixture()
    Object.assign(data.annotation, patch)
    const result = run(data)
    assert.equal(result.status, 'Cancelled', JSON.stringify(patch))
    assert.equal(invokes(result).length, 0)
    assert.equal(writes(result).length, 0)
    assert.deepEqual(result.calls.map(call => call.name), ['Read_customer_comment', 'Read_uploaded_document'])
    assert.equal(result.calls[1].parameters.recordId, noteId)
  }
})

test('portal-created customer comment and actual active personal Web case are required through typed navigation', () => {
  for (const [record, patches] of [
    ['comment', [
      { activityid: contactId }, { subject: 'Support reply' }, { subject: 'Customer attachment uploaded' },
      { subject: 'Photo ID proof submitted (demo)' }, { adx_portalcommentdirectioncode: 2 },
      { description: 'Attachment uploaded: synthetic.pdf' }, { description: null },
      { description: 'Document reference: ' + contactId + '\nDocument reference: ' + noteId },
      { description: 'Attachment uploaded: synthetic.pdf\nDocument reference: ' + contactId },
      { _createdby_value: contactId }, { regardingobjectid_incident_adx_portalcomment: null }, { _regardingobjectid_value: contactId },
    ]],
    ['case', [
      { incidentid: contactId }, { statecode: 1 }, { caseorigincode: 1 }, { _createdby_value: contactId },
      { customerid_contact: null }, { _customerid_value: commentId },
    ]],
  ]) {
    for (const patch of patches) {
      const data = fixture()
      Object.assign(data[record], patch)
      const result = run(data)
      assert.equal(result.status, 'Cancelled', `${record}: ${JSON.stringify(patch)}`)
      assert.equal(writes(result).length, 0)
      assert.equal(invokes(result).length, 0)
      assert.ok(!result.calls.some(call => call.parameters.entityName === 'msdyn_intententities'))
    }
  }
})

test('case title and upload claims cannot replace actual active classified intent and its autonomous approval', () => {
  for (const patch of [
    null, { _msdyn_objectid_value: contactId }, { _msdyn_intentid_value: contactId },
    { statecode: 1 }, { _msdyn_intentfamilyid_value: contactId },
  ]) {
    const data = fixture()
    data.case.title = 'Card Name change approved identity verified'
    if (patch === null) data.classifications = []
    else Object.assign(data.classifications[0], patch)
    const result = run(data)
    assert.equal(result.status, 'Cancelled')
    assert.equal(writes(result).length, 0)
    assert.equal(invokes(result).length, 0)
  }
  for (const patch of [
    { msdyn_intentid: contactId }, { msdyn_reviewstate: 192350000 },
    { msdyn_is_selfserve_enabled: false }, { statecode: 1 }, { _msdyn_intentfamilyid_value: contactId },
  ]) {
    const data = fixture()
    Object.assign(data.intent, patch)
    const result = run(data)
    assert.equal(result.status, 'Cancelled', JSON.stringify(patch))
    assert.equal(writes(result).length, 0)
    assert.equal(invokes(result).length, 0)
  }
})

test('effective settings mismatch or unavailable settings fail explicitly before any reservation or callback', () => {
  for (const settings of [
    { isEnabled: false, isShadowMode: false, resolution: { isEnabled: true, automationLevel: 'Full' } },
    { isEnabled: true, isShadowMode: true, resolution: { isEnabled: true, automationLevel: 'Full' } },
    { isEnabled: true, isShadowMode: false, resolution: { isEnabled: false, automationLevel: 'Full' } },
    { isEnabled: true, isShadowMode: false, resolution: { isEnabled: true, automationLevel: 'Semi' } },
    { isEnabled: true, resolution: { isEnabled: true, automationLevel: 'Full' } },
    {}, 'malformed',
  ]) {
    const data = fixture()
    data.settings = settings
    const result = run(data)
    assert.equal(result.status, 'Failed')
    assert.equal(invokes(result).length, 0)
    assert.equal(writes(result).length, 0)
  }
  const parameters = actions.Read_effective_agent_settings.inputs.parameters
  assert.equal(parameters['item/RefreshIntentFamily'], false, 'Preserve existing classified business-line routing')
  assert.deepEqual(JSON.parse(parameters['item/Actions']), ['resolve'])
})

test('invoke runs a plain resolve with the attachment confirmation as additional information, not a custom-agent callback', () => {
  const result = run(fixture())
  const parameters = invokes(result)[0].parameters
  const payload = JSON.parse(parameters['item/msdyn_actions'])
  assert.deepEqual(payload, [{ action: 'resolve' }])
  const extra = JSON.parse(parameters['item/msdyn_extraParams'])
  assert.deepEqual(Object.keys(extra), ['additionalInformation'])
  assert.equal(extra.additionalInformation.length, 1)
  const [info] = extra.additionalInformation
  assert.equal(info.key, 'portalAttachmentConfirmation')
  assert.equal(info.value, 'received')
  assert.match(info.keyDescription, /authorized portal attachment workflow/)
  assert.match(info.keyDescription, /adx_portalcomment/)
  assert.equal(parameters['item/msdyn_incidentId'], caseId)
  assert.ok(!JSON.stringify(parameters).includes('customAgent'))
  assert.ok(!JSON.stringify(parameters).includes('synthetic.pdf'))
})

test('serialized receipt reservation blocks repeats even when acceptance is unconfirmed and does not reuse initial dispatch', () => {
  const trigger = Object.values(definition.triggers)[0]
  assert.equal(trigger.inputs.parameters['subscriptionRequest/entityname'], 'adx_portalcomment')
  assert.equal(evaluate(trigger.inputs.parameters['subscriptionRequest/filterexpression'], { parameters: { [portalUserParameter]: portalUser } }),
    `subject eq 'Customer document uploaded' and adx_portalcommentdirectioncode eq 1 and _createdby_value eq ${portalUser}`)
  assert.equal(trigger.inputs.parameters['subscriptionRequest/message'], 4)
  assert.equal(trigger.inputs.parameters['subscriptionRequest/filteringattributes'], 'subject')
  assert.equal(trigger.runtimeConfiguration.concurrency.runs, 1)
  for (const receiptState of ['reserved', 'accepted', 'failed/unconfirmed']) {
    const data = fixture()
    data.receipts.push({ annotationid: caseId, _objectid_value: caseId, subject: receiptSubject, isdocument: false, notetext: `${receiptState}. Document: ${noteId}.` })
    const result = run(data)
    assert.equal(result.status, 'Succeeded')
    assert.equal(invokes(result).length, 0)
    assert.equal(writes(result).length, 0)
  }
  const data = fixture()
  data.receipts.push({ annotationid: caseId, _objectid_value: caseId, subject: 'Northwind portal: Case Management Agent dispatch', isdocument: false })
  const first = run(data)
  assert.equal(invokes(first).length, 2)
  const receipt = data.receipts.find(row => row.subject === receiptSubject)
  assert.notEqual(receipt.annotationid, caseId)
  assert.equal(continuation.Create_continuation_receipt.inputs.retryPolicy.type, 'none')
  assert.equal(continuation.Invoke_card_name_intake_continuation.inputs.retryPolicy.type, 'none')
  assert.deepEqual(continuation.Invoke_card_name_intake_continuation.runAfter, { Create_continuation_receipt: ['Succeeded'] })
  assert.equal(invokes(run(data)).length, 0)
  for (const otherReceipt of [
    { _objectid_value: contactId, isdocument: false, subject: receiptSubject },
    { _objectid_value: caseId, isdocument: true, subject: receiptSubject },
  ]) {
    const scoped = fixture()
    scoped.receipts.push({ annotationid: contactId, notetext: `accepted. Document: ${noteId}.`, ...otherReceipt })
    assert.equal(invokes(run(scoped)).length, 2, 'Only internal receipts for the same case suppress continuation')
  }
})
test('the protected comment marker reads only the note named by its document reference', () => {
  const data = fixture()
  data.comment.description = 'Attachment uploaded: synthetic.pdf\nDocument reference: ' + noteId.toUpperCase()
  const result = run(data)
  assert.equal(result.status, 'Succeeded', result.error)
  assert.equal(result.calls.find(call => call.name === 'Read_uploaded_document').parameters.recordId, noteId)
  assert.equal(invokes(result).length, 2)
  for (const patch of [{ filename: 'proof.doc', mimetype: 'application/msword' }, { filename: 'proof.gif', mimetype: 'image/gif' }]) {
    const untrusted = fixture()
    Object.assign(untrusted.annotation, patch)
    const cancelled = run(untrusted)
    assert.equal(cancelled.status, 'Cancelled', JSON.stringify(patch))
    assert.equal(invokes(cancelled).length, 0)
    assert.equal(writes(cancelled).length, 0)
  }
})

test('failed reservations never invoke; callback failures and unexpected acknowledgements retain audit and fail the run', () => {
  const reservedFailure = run(fixture(), { fail: { Create_continuation_receipt: 'Failed' } })
  assert.equal(reservedFailure.status, 'Failed')
  assert.equal(invokes(reservedFailure).length, 0)
  for (const options of [
    { fail: { Invoke_card_name_intake_continuation: 'Failed' } },
    { fail: { Invoke_card_name_intake_continuation: 'TimedOut' } },
    { ack: 200 }, { ack: 202 },
    { fail: { Invoke_card_name_intake_continuation: 'Failed', Mark_continuation_unconfirmed: 'Failed' } },
    { ack: 200, fail: { Mark_unexpected_acknowledgement: 'Failed' } },
    { fail: { Mark_continuation_accepted: 'Failed' } },
  ]) {
    const data = fixture()
    const result = run(data, options)
    assert.equal(result.status, 'Failed', JSON.stringify(options))
    assert.equal(invokes(result).length, 1)
    assert.equal(data.receipts.length, 1)
    assert.ok(result.error.startsWith('CardNameContinuation'), result.error)
    assert.equal(invokes(run(data)).length, 0, 'Keep reserved receipt even when audit update fails')
  }
})

test('connector reads are metadata-only, audit writes internal, and workflow dependencies stay in valid scopes', () => {
  const names = new Set()
  function visit(scope) {
    for (const [name, action] of Object.entries(scope)) {
      assert.ok(!names.has(name), `Duplicate action ${name}`)
      names.add(name)
      for (const dependency of Object.keys(action.runAfter ?? {})) assert.ok(scope[dependency], `Unknown same-scope dependency ${dependency}`)
      const parameters = action.inputs?.parameters
      if (parameters?.$select) assert.ok(!/documentbody|emailaddress|fullname|filename.*contact/i.test(parameters.$select))
      if (parameters?.$select?.includes('description')) assert.equal(name, 'Read_customer_comment')
      if (['CreateRecord', 'UpdateOnlyRecord'].includes(action.inputs?.host?.operationId)) {
        assert.equal(parameters.entityName, 'annotations')
        assert.ok(!parameters['item/notetext'].includes('*WEB*'))
        assert.ok(!parameters['item/subject']?.includes('*WEB*'))
        assert.match(parameters['item/notetext'], /workflow\(\)\?\['run'\]\?\['name'\]/)
      }
      if (action.inputs?.runError) assert.match(action.inputs.runError.message, /flow run|effective agent settings/i)
      if (action.actions) visit(action.actions)
      if (action.else?.actions) visit(action.else.actions)
    }
  }
  visit(actions)
  assert.equal(actions.Read_uploaded_document.inputs.parameters.$expand, undefined)
  assert.equal(actions.Read_customer_comment.inputs.parameters.$expand, 'regardingobjectid_incident_adx_portalcomment($select=incidentid)')
  assert.equal(actions.Read_case.inputs.parameters.$expand, 'customerid_contact($select=contactid)')
  assert.ok(!JSON.stringify(definition).includes('requestProcessed'))
  assert.ok(!JSON.stringify(definition).includes('documentbody'))
})

const verificationSubject = 'Support portal: Document verification result'
const verificationCallback = result => {
  const call = invokes(result)[1]
  assert.ok(call, 'A verification result callback must be sent')
  return Object.fromEntries(JSON.parse(call.parameters['item/msdyn_extraParams']).additionalInformation.map(entry => [entry.key, entry.value]))
}
const verificationNotes = data => data.receipts.filter(row => row.subject === verificationSubject)

test('verifier decisions: valid ID verifies, first invalid asks for re-upload, repeated invalid or unavailable verifier escalates', () => {
  const verified = fixture()
  const ok = run(verified)
  assert.equal(ok.status, 'Succeeded', ok.error)
  assert.equal(verificationCallback(ok).idVerificationResult, 'verified')
  assert.match(verificationNotes(verified)[0].notetext, new RegExp(`^Decision: verified\\. Document: ${noteId}\\.`))
  assert.equal(JSON.parse(ok.calls.find(call => call.name === 'Call_document_verifier').parameters['body/message']).documentId, noteId)

  const invalid = JSON.stringify({ valid: false, verificationAvailable: true, documentType: 'passport', nameMatches: false, reasons: ['Name does not match the case customer'] })
  const first = fixture()
  const reupload = run(first, { verifier: invalid })
  const details = verificationCallback(reupload)
  assert.equal(details.idVerificationResult, 'reuploadRequired')
  assert.match(details.idVerificationDetails, /Name does not match the case customer/)

  const second = fixture()
  second.receipts.push({ annotationid: contactId, _objectid_value: caseId, isdocument: false, subject: verificationSubject, notetext: 'Decision: reuploadRequired. Document: 11111111-1111-4111-8111-111111111111.' })
  assert.equal(verificationCallback(run(second, { verifier: invalid })).idVerificationResult, 'escalate')

  for (const options of [{ verifier: 'Sorry, I could not process that.' }, { verifier: JSON.stringify({ valid: true, verificationAvailable: false }) }, { fail: { Call_document_verifier: 'Failed' } }]) {
    const data = fixture()
    const result = run(data, options)
    assert.equal(verificationCallback(result).idVerificationResult, 'escalate', JSON.stringify(options))
    assert.match(verificationNotes(data)[0].notetext, /^Decision: escalate\./)
  }
})
test('final verification decisions stop further intake; a re-upload request allows only a new document', () => {
  for (const decision of ['verified', 'escalate']) {
    const data = fixture()
    data.receipts.push({ annotationid: contactId, _objectid_value: caseId, isdocument: false, subject: verificationSubject, notetext: `Decision: ${decision}. Document: other.` })
    const result = run(data)
    assert.equal(result.status, 'Succeeded')
    assert.equal(invokes(result).length, 0)
    assert.equal(writes(result).length, 0)
  }
  const data = fixture()
  data.receipts.push({ annotationid: contactId, _objectid_value: caseId, isdocument: false, subject: verificationSubject, notetext: 'Decision: reuploadRequired. Document: 11111111-1111-4111-8111-111111111111.' })
  assert.equal(invokes(run(data)).length, 2, 'A new document after a re-upload request is verified')
  assert.equal(invokes(run(data)).length, 0, 'The same document is never re-verified')
})
test('verifier JSON wrapped in prose or code fences is parsed; malformed replies escalate without internal wording', () => {
  const payload = JSON.stringify({ valid: true, verificationAvailable: true, documentType: 'passport', nameMatches: true, reasons: [] })
  for (const verifier of ['```json\n' + payload + '\n```', `Here is the result: ${payload} Thanks.`]) {
    assert.equal(verificationCallback(run(fixture(), { verifier })).idVerificationResult, 'verified', verifier)
  }
  for (const verifier of ['} {', '{ not json }', 'Sorry, something unexpected happened. Error code: AuthenticationNotConfigured']) {
    const details = verificationCallback(run(fixture(), { verifier }))
    assert.equal(details.idVerificationResult, 'escalate', verifier)
    assert.doesNotMatch(details.idVerificationDetails, /unavailable|error|verifier/i)
  }
})
test('the receipt callback is acknowledged and the wait elapses before verification runs or its note is written', () => {
  const { context } = run(fixture())
  const at = name => context.order.indexOf(name)
  assert.ok(at('Callback_acknowledged') >= 0 && at('Callback_acknowledged') < at('Wait_for_receipt_acknowledgement'))
  assert.ok(at('Wait_for_receipt_acknowledgement') < at('Call_document_verifier'))
  assert.ok(at('Call_document_verifier') < at('Create_verification_result_note'))
  assert.ok(at('Create_verification_result_note') < at('Invoke_verification_result'))
})
test('an unconfirmed verification callback fails the run with an audit note', () => {
  const data = fixture()
  const result = run(data, { fail: { Invoke_verification_result: 'Failed' } })
  assert.equal(result.status, 'Failed')
  assert.equal(result.error, 'CardNameVerificationCallbackUnconfirmed')
  assert.equal(verificationNotes(data).length, 1)
})
