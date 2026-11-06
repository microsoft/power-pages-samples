const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const flow = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'integrations', 'case-management', 'flow.json'), 'utf8'))
const deploymentPath = path.join(__dirname, '..', 'integrations', 'case-management', 'deployment.json')
const deployment = fs.existsSync(deploymentPath) ? JSON.parse(fs.readFileSync(deploymentPath, 'utf8')) : null
const definition = flow.properties.definition
const actions = definition.actions.Guard_portal_case.actions
const PORTAL_USER = 'Modern CSS - Portal application user ID (ppst_ModernCss_PortalApplicationUserId)'
const PORTAL_URL = 'Modern CSS - Portal URL (ppst_ModernCss_PortalUrl)'
function assertEnvironmentVariable(parameters, key) {
  const schemaName = key.match(/\(([^)]+)\)$/)[1]
  assert.equal(parameters[key]?.type, 'String')
  assert.equal(parameters[key].metadata?.schemaName, schemaName)
}

test('case agent trigger is Added-only and restricted to this portal, Web origin and active cases', () => {
  const [trigger] = Object.values(definition.triggers)
  assert.equal(Object.keys(definition.triggers).length, 1)
  assert.equal(trigger.type, 'OpenApiConnectionWebhook')
  const parameters = trigger.inputs.parameters
  assert.equal(parameters['subscriptionRequest/message'], 1)
  assert.equal(parameters['subscriptionRequest/entityname'], 'incident')
  assert.equal(parameters['subscriptionRequest/scope'], 4)
  assert.equal(parameters['subscriptionRequest/filterexpression'], `@concat('caseorigincode eq 3 and _createdby_value eq ', parameters('${PORTAL_USER}'), ' and statecode eq 0')`)
  assertEnvironmentVariable(definition.parameters, PORTAL_USER)
  assert.ok(!definition.parameters.PortalApplicationUserId, 'The portal user must come from the environment variable')
  assert.deepEqual(definition.actions.Guard_portal_case.expression.and, [
    { equals: ["@outputs('Read_case')?['body/caseorigincode']", 3] },
    { equals: ["@outputs('Read_case')?['body/_createdby_value']", `@parameters('${PORTAL_USER}')`] },
    { equals: ["@outputs('Read_case')?['body/statecode']", 0] },
  ])
})

test('agent dispatch always requests human review and never automatically retries', () => {
  const invoke = actions.Invoke_case_management_agent
  assert.equal(invoke.inputs.parameters.actionName, 'msdyn_invokeCaseProcessingAgent')
  assert.deepEqual(JSON.parse(invoke.inputs.parameters['item/msdyn_actions']), [{ action: 'resolve', automationLevel: 'Semi' }])
  assert.equal(invoke.inputs.retryPolicy.type, 'none')
  assert.deepEqual(invoke.runAfter, { Create_dispatch_receipt: ['Succeeded'] })
  assert.deepEqual(actions.Create_dispatch_receipt.runAfter, { Enforce_human_review: ['Succeeded'] })
  assert.equal(actions.Read_effective_agent_settings.inputs.parameters.actionName, 'msdyn_GetCaseManagementAgentSettings')
  assert.equal(actions.Read_effective_agent_settings.inputs.parameters['item/Actions'], '["resolve"]')
  assert.equal(actions.Read_effective_agent_settings.inputs.parameters['item/RefreshIntentFamily'], true)
  assert.match(actions.Enforce_human_review.expression, /resolution.*automationLevel.*'Semi'/)
  assert.equal(actions.Enforce_human_review.actions.Stop_unsafe_or_disabled_agent.inputs.runError.code, 'HumanReviewRequired')
  assert.equal(actions.Enforce_human_review.actions.Stop_unsafe_or_disabled_agent.inputs.runStatus, 'Failed')
  assert.equal(actions.Create_dispatch_receipt.inputs.retryPolicy.type, 'none')
  assert.equal(actions.Create_dispatch_receipt.inputs.parameters['item/annotationid'], "@outputs('Read_case')?['body/incidentid']")
  assert.match(actions.Mark_dispatch_accepted.inputs.parameters['item/notetext'], /not a resolution confirmation/)
  assert.deepEqual(actions.Mark_dispatch_unconfirmed.runAfter, { Invoke_case_management_agent: ['Failed', 'TimedOut'] })
  assert.equal(actions.Report_dispatch_failure.inputs.runStatus, 'Failed')
})

test('dispatch receipts are internal and the flow neither sends emails nor changes cases', () => {
  for (const action of Object.values(actions)) {
    const input = action.inputs
    if (!input) continue
    if (input.host) {
      assert.equal(input.host.apiId, '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps')
      assert.ok(['CreateRecord', 'UpdateOnlyRecord', 'PerformUnboundAction'].includes(input.host.operationId))
      if (input.host.operationId === 'PerformUnboundAction') {
        assert.ok(['msdyn_GetCaseManagementAgentSettings', 'msdyn_invokeCaseProcessingAgent'].includes(input.parameters.actionName))
      }
    }
    if (input.parameters?.entityName) assert.equal(input.parameters.entityName, 'annotations')
    if (input.parameters?.['item/notetext']) assert.ok(!input.parameters['item/notetext'].startsWith('*WEB*'))
  }
})

test('business-line rules match only Northwind Web cases and preserve human review', { skip: !deployment && 'Environment deployment record not included' }, () => {
  assert.equal(deployment.businessLine.automationValue, 1)
  assert.equal(deployment.businessLine.automationLevel, 'Semi')
  assert.equal(deployment.businessLine.isDefault, false)
  assert.equal(deployment.portalApplicationUserId, definition.parameters[PORTAL_USER].defaultValue)
  for (const [rule, prefix] of [[deployment.caseRule, 'incident'], [deployment.emailRule, 'email.regardingobjectid_incident_email']]) {
    assert.deepEqual([...rule.definition.matchAll(/<lhs type="attribute">([^<]+)<\/lhs>/g)].map(match => match[1]), [
      `${prefix}.caseorigincode`, `${prefix}.createdby.systemuserid`, 'action.msdyn_intentfamilyid',
    ])
    assert.deepEqual([...rule.definition.matchAll(/<rhs type="staticvalue">([^<]+)<\/rhs>/g)].map(match => match[1]), [
      '3', `{${deployment.portalApplicationUserId}}`, `{${deployment.businessLine.id}}`,
    ])
    assert.deepEqual([...rule.fetchXml.matchAll(/<condition attribute="([^"]+)" operator="([^"]+)" value="([^"]+)"/g)].map(match => match.slice(1)), [
      ['caseorigincode', 'eq', '3'], ['createdby', 'eq', `{${deployment.portalApplicationUserId}}`],
    ])
  }
})

const publisherPath = path.join(__dirname, '..', 'integrations', 'case-management', 'publish-response-flow.json')
const publisher = JSON.parse(fs.readFileSync(publisherPath, 'utf8')).properties.definition
const publishActions = publisher.actions
const newPublication = publishActions.Publication_exists.else.actions
const SENT_EMAIL = "outputs('Read_sent_email')"
const CASE_CONTACT = "outputs('Read_case')?['body/customerid_contact']?['contactid']"

function skipsQuietly(guard) {
  const stops = Object.values(guard.actions).filter(action => action.type === 'Terminate')
  assert.equal(stops.length, 1)
  assert.equal(stops[0].inputs.runStatus, 'Succeeded')
  assert.ok(Object.values(guard.actions).some(action => action.type === 'Compose' && action.inputs.status === 'Skipped'))
}

test('publisher triggers only when a native Send of an outgoing case email is accepted (Pending Send)', () => {
  assert.deepEqual(Object.keys(publisher.triggers), ['When_case_email_Send_is_accepted'])
  const trigger = publisher.triggers.When_case_email_Send_is_accepted
  assert.equal(trigger.type, 'OpenApiConnectionWebhook')
  assert.equal(trigger.inputs.host.operationId, 'SubscribeWebhookTrigger')
  // Modified (3) only: Save/AutoSave keep Draft, and record-only IssueSend:false goes straight to Sent (3), never Pending Send (6).
  assert.deepEqual(trigger.inputs.parameters, {
    'subscriptionRequest/message': 3,
    'subscriptionRequest/entityname': 'email',
    'subscriptionRequest/scope': 4,
    'subscriptionRequest/filteringattributes': 'statecode,statuscode',
    'subscriptionRequest/filterexpression': 'directioncode eq true and statecode eq 1 and statuscode eq 6 and _regardingobjectid_value ne null',
  })
  for (const key of [PORTAL_USER, PORTAL_URL]) assertEnvironmentVariable(publisher.parameters, key)
  assert.deepEqual(Object.keys(publisher.parameters).filter(key => !key.startsWith('$')), [PORTAL_USER, PORTAL_URL])
  const text = JSON.stringify(publisher)
  for (const removed of ['ApprovalWriterUserId', 'Reviewed Send approval', 'htmlBase64', 'outsideTransaction', 'shared_approvals']) {
    assert.ok(!text.includes(removed), `${removed} belongs to the removed plug-in approval path`)
  }
})

test('publisher skips other email quietly: non-case, non-Northwind cases and replies not addressed solely to the case Contact', () => {
  assert.deepEqual(publishActions.Read_sent_email.runAfter, {})
  assert.equal(publishActions.Read_sent_email.inputs.parameters.entityName, 'emails')
  assert.equal(publishActions.Read_sent_email.inputs.parameters.recordId, "@triggerBody()?['activityid']")
  assert.equal(publishActions.Read_sent_email.inputs.parameters.$select, 'activityid,description,directioncode,statecode,statuscode,versionnumber,_regardingobjectid_value')
  assert.match(publishActions.Require_outgoing_case_email.expression, /directioncode'\], true\).*regardingobjectid_incident_email/)
  skipsQuietly(publishActions.Require_outgoing_case_email)

  assert.equal(publishActions.Read_case.inputs.parameters.recordId, `@${SENT_EMAIL}?['body/regardingobjectid_incident_email']?['incidentid']`)
  assert.deepEqual(publishActions.Read_case.runAfter, { Require_outgoing_case_email: ['Succeeded'] })
  assert.equal(publishActions.Read_case.inputs.parameters.$expand, 'customerid_contact($select=contactid)')
  const scope = publishActions.Require_Northwind_personal_case.expression
  assert.match(scope, /caseorigincode'\], 3\)/)
  assert.ok(scope.includes(`equals(outputs('Read_case')?['body/_createdby_value'], parameters('${PORTAL_USER}'))`))
  assert.ok(scope.includes(`not(empty(${CASE_CONTACT}))`))
  assert.ok(scope.includes(`equals(outputs('Read_case')?['body/_customerid_value'], ${CASE_CONTACT})`))
  skipsQuietly(publishActions.Require_Northwind_personal_case)

  const recipients = publishActions.Read_To_recipients.inputs.parameters
  assert.equal(recipients.entityName, 'activityparties')
  assert.equal(recipients.$filter, `@concat('_activityid_value eq ', ${SENT_EMAIL}?['body/activityid'], ' and participationtypemask eq 2')`)
  assert.equal(recipients.$top, 2)
  assert.equal(recipients.$expand, 'partyid_contact($select=contactid)')
  assert.equal(publishActions.Require_case_Contact_as_sole_recipient.expression,
    `@not(and(equals(length(outputs('Read_To_recipients')?['body/value']), 1), equals(first(outputs('Read_To_recipients')?['body/value'])?['partyid_contact']?['contactid'], ${CASE_CONTACT})))`)
  skipsQuietly(publishActions.Require_case_Contact_as_sole_recipient)
})

test('publisher uses only the text of a locked, accepted email and never depends on delivery', () => {
  const lock = publishActions.Require_locked_sent_email
  assert.deepEqual(lock.runAfter, { Require_case_Contact_as_sole_recipient: ['Succeeded'] })
  assert.ok(lock.expression.includes(`equals(${SENT_EMAIL}?['body/statecode'], 1)`))
  assert.deepEqual([...lock.expression.matchAll(/statuscode'\], (\d+)\)/g)].map(match => Number(match[1])), [6, 7, 3])
  assert.equal(lock.actions.Stop_unlocked_email.inputs.runStatus, 'Failed')
  assert.equal(lock.actions.Stop_unlocked_email.inputs.runError.code, 'SendNotLocked')
  assert.deepEqual(publishActions.Find_publication_receipt.runAfter, { Require_locked_sent_email: ['Succeeded'] })

  assert.equal(newPublication.Convert_approved_snapshot_to_text.inputs.host.operationId, 'HtmlToText')
  assert.equal(newPublication.Convert_approved_snapshot_to_text.inputs.parameters.Content, `@coalesce(${SENT_EMAIL}?['body/description'], '')`)
  assert.equal(newPublication.Approved_text.inputs, "@trim(body('Convert_approved_snapshot_to_text'))")
  assert.match(newPublication.Require_publishable_text.expression, /lessOrEquals\(length\(outputs\('Approved_text'\)\), 4000\)/)
  assert.equal(newPublication.Require_publishable_text.actions.Stop_invalid_approved_text.inputs.runStatus, 'Failed')
  const text = JSON.stringify(publisher)
  assert.ok(!text.includes('substring('))
  assert.ok(!text.includes('senton'))
  assert.ok(!text.includes('deliveryattempts'))
})

test('publication reserves by email ID but uses a separate activity ID and confirms before success', () => {
  assert.equal(publishActions.Find_publication_receipt.inputs.parameters.$filter, `@concat('annotationid eq ', ${SENT_EMAIL}?['body/activityid'])`)
  assert.equal(newPublication.Reserve_publication.inputs.parameters['item/annotationid'], `@${SENT_EMAIL}?['body/activityid']`)
  assert.equal(newPublication.New_comment_id.inputs, '@guid()')
  assert.equal(newPublication.Create_portal_response.inputs.parameters['item/activityid'], "@outputs('New_comment_id')")
  assert.equal(newPublication.Create_portal_response.inputs.parameters['item/subject'], '*WEB* Reviewed support response')
  assert.equal(newPublication.Create_portal_response.inputs.parameters['item/adx_portalcommentdirectioncode'], 2)
  assert.equal(newPublication.Create_portal_response.inputs.parameters['item/description'], "@outputs('Publication_receipt')?['approvedText']")
  assert.deepEqual(newPublication.Publication_receipt.inputs, {
    schemaVersion: 5,
    status: 'Reserved',
    emailId: `@${SENT_EMAIL}?['body/activityid']`,
    caseId: "@outputs('Read_case')?['body/incidentid']",
    contactId: `@${CASE_CONTACT}`,
    commentId: "@outputs('New_comment_id')",
    approvedText: "@outputs('Approved_text')",
    sourceEmailVersion: `@string(${SENT_EMAIL}?['body/versionnumber'])`,
    flowRunId: "@workflow()?['run']?['name']",
    publicationMethod: 'SendAccepted',
    approvedBy: "@triggerBody()?['_modifiedby_value']",
    approvedAt: "@triggerBody()?['modifiedon']",
  })
  assert.equal(newPublication.Reserve_publication.inputs.parameters['item/isdocument'], false)
  assert.ok(!newPublication.Reserve_publication.inputs.parameters['item/subject'].startsWith('*WEB*'))
  assert.equal(newPublication.Complete_publication_receipt.inputs.parameters.recordId, `@${SENT_EMAIL}?['body/activityid']`)
  assert.deepEqual(newPublication.Create_portal_response.runAfter, { Reserve_publication: ['Succeeded'] })
  assert.deepEqual(newPublication.Complete_publication_receipt.runAfter, { Verify_published_response: ['Succeeded'] })
  assert.deepEqual(newPublication.Published.runAfter, { Complete_publication_receipt: ['Succeeded'] })
  assert.equal(newPublication.Published.type, 'Compose')
  assert.equal(newPublication.Published.inputs.status, 'Published')
  for (const action of [newPublication.Reserve_publication, newPublication.Create_portal_response]) assert.equal(action.inputs.retryPolicy.type, 'none')
  const replay = publishActions.Publication_exists.actions
  // Receipts written by the plug-in (v4) and earlier publishers stay valid, so a re-Send after cutover returns AlreadyPublished.
  assert.match(replay.Require_matching_completed_receipt.expression, /schemaVersion'\], 5.*SendAccepted.*schemaVersion'\], 4.*NativeSend.*approvalRequestId.*schemaVersion'\], 3.*SentEmail.*sourceSentOn.*schemaVersion'\], 1.*schemaVersion'\], 2.*approvalId.*approvedBy.*status.*Published.*emailId.*Read_sent_email.*caseId.*contactId.*approvedText.*commentId/)
  assert.deepEqual(replay.Already_published.runAfter, { Verify_existing_response: ['Succeeded'] })
  assert.equal(replay.Already_published.type, 'Compose')
  assert.equal(replay.Already_published.inputs.status, 'AlreadyPublished')
  assert.match(replay.Verify_existing_response.expression, /greaterOrEquals\(outputs\('Existing_receipt'\)\?\['schemaVersion'\], 4\), '\*WEB\* Reviewed support response'.*Support email response.*AI-assisted support response/)
})

test('changed case ownership blocks publication after the text is converted', () => {
  assert.equal(newPublication.Require_unchanged_case_audience.expression,
    `@not(and(equals(outputs('Read_case_before_publish')?['body/caseorigincode'], 3), equals(outputs('Read_case_before_publish')?['body/_createdby_value'], parameters('${PORTAL_USER}')), equals(outputs('Read_case_before_publish')?['body/customerid_contact']?['contactid'], ${CASE_CONTACT}), equals(outputs('Read_case_before_publish')?['body/_customerid_value'], ${CASE_CONTACT})))`)
  assert.deepEqual(newPublication.Require_unchanged_case_audience.runAfter, { Read_case_before_publish: ['Succeeded'] })
  assert.deepEqual(newPublication.New_comment_id.runAfter, { Require_unchanged_case_audience: ['Succeeded'] })
  assert.equal(newPublication.Require_unchanged_case_audience.actions.Stop_changed_case_audience.inputs.runError.code, 'ApprovedCaseChanged')
})

test('publisher never sends or edits email and exposes no portal-callable entry point', () => {
  const actionNames = new Set()
  function visit(actions) {
    for (const [name, action] of Object.entries(actions)) {
      assert.ok(!actionNames.has(name), `Duplicate workflow action name: ${name}`)
      actionNames.add(name)
      assert.notEqual(action.type, 'Response')
      const input = action.inputs
      if (input?.host) {
        const api = input.host.apiId
        if (api.endsWith('/shared_commondataserviceforapps')) {
          assert.ok(['GetItem', 'ListRecords', 'CreateRecord', 'UpdateOnlyRecord'].includes(input.host.operationId), input.host.operationId)
          if (['CreateRecord', 'UpdateOnlyRecord'].includes(input.host.operationId)) {
            assert.ok(['annotations', 'adx_portalcomments'].includes(input.parameters.entityName))
          }
        } else {
          assert.equal(api, '/providers/Microsoft.PowerApps/apis/shared_conversionservice')
          assert.equal(input.host.operationId, 'HtmlToText')
        }
      }
      if (action.actions) visit(action.actions)
      if (action.else?.actions) visit(action.else.actions)
    }
  }
  visit(publishActions)
  assert.equal(publishActions.Publication_exists.runAfter.Find_publication_receipt[0], 'Succeeded')
})

// The dev tree keeps the exported solution beside the site; the published template keeps it pac-unpacked under solutions/.
const solutionRoot = [path.join(__dirname, '..', '..', 'solution'), path.join(__dirname, '..', '..', '..', '..', 'solutions', 'ModernCSSMetadata')]
  .find(candidate => fs.existsSync(candidate))
const unpackedSolution = !!solutionRoot && fs.existsSync(path.join(solutionRoot, 'Other', 'Solution.xml'))
const solutionFile = name => fs.readFileSync(path.join(solutionRoot, name), 'utf8')

test('template solution ships both flows exactly as checked in, with no plug-in or SYSTEM-user variable', () => {
  assert.ok(solutionRoot, 'template solution folder not found')
  const workflows = fs.readdirSync(path.join(solutionRoot, 'Workflows')).filter(name => name.endsWith('.json'))
  assert.equal(workflows.length, 2)
  for (const [source, prefix] of [[flow, 'Northwind-CaseManagementAgentreviewrequired-'], [JSON.parse(fs.readFileSync(publisherPath, 'utf8')), 'Northwind-Publishreviewedresponsetoportal-']]) {
    const file = workflows.find(name => name.startsWith(prefix))
    assert.ok(file, `${prefix} workflow missing from the solution`)
    const packaged = JSON.parse(solutionFile(path.join('Workflows', file)))
    assert.deepEqual(packaged.properties.definition, source.properties.definition)
    assert.deepEqual(packaged.properties.connectionReferences, source.properties.connectionReferences)
  }

  const customizations = solutionFile(unpackedSolution ? path.join('Other', 'Customizations.xml') : 'customizations.xml')
  const manifest = solutionFile(unpackedSolution ? path.join('Other', 'Solution.xml') : 'solution.xml')
  for (const removed of ['<SolutionPluginAssemblies', '<PluginAssembly ', '<SdkMessageProcessingStep', 'SendApproval']) {
    assert.ok(!customizations.includes(removed), `customizations.xml still contains ${removed}`)
    assert.ok(!manifest.includes(removed), `solution.xml still contains ${removed}`)
  }
  assert.deepEqual([...manifest.matchAll(/<RootComponent type="(\d+)"/g)].map(match => match[1]).sort(), ['1', '29', '29'])
  assert.ok(!fs.existsSync(path.join(solutionRoot, 'PluginAssemblies')))
  assert.ok(!fs.existsSync(path.join(solutionRoot, 'SdkMessageProcessingSteps')))
  if (!unpackedSolution) assert.ok(!solutionFile('[Content_Types].xml').includes('Extension="dll"'))

  const variables = fs.readdirSync(path.join(solutionRoot, 'environmentvariabledefinitions')).sort()
  assert.deepEqual(variables, ['ppst_ModernCss_PortalApplicationUserId', 'ppst_ModernCss_PortalUrl'])
  for (const definitionParameters of [definition.parameters, publisher.parameters]) {
    for (const parameter of Object.values(definitionParameters)) {
      if (parameter.metadata?.schemaName) assert.ok(variables.includes(parameter.metadata.schemaName), `${parameter.metadata.schemaName} has no packaged definition`)
    }
  }
})
