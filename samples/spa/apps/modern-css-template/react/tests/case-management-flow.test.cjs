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
const APPROVAL_WRITER = 'Modern CSS - Approval writer (SYSTEM) user ID (ppst_ModernCss_ApprovalWriterUserId)'
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

const publisher = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'integrations', 'case-management', 'publish-response-flow.json'), 'utf8')).properties.definition
const publishActions = publisher.actions
const newPublication = publishActions.Publication_exists.else.actions

test('publisher listens only for SYSTEM-authored Native Send approvals, not email delivery changes', () => {
  assert.deepEqual(Object.keys(publisher.triggers), ['When_reviewed_Send_is_captured'])
  const trigger = publisher.triggers.When_reviewed_Send_is_captured
  assert.equal(trigger.type, 'OpenApiConnectionWebhook')
  assert.equal(trigger.inputs.host.operationId, 'SubscribeWebhookTrigger')
  assert.deepEqual(trigger.inputs.parameters, {
    'subscriptionRequest/message': 1,
    'subscriptionRequest/entityname': 'annotation',
    'subscriptionRequest/scope': 4,
    'subscriptionRequest/filterexpression': `@concat('subject eq ''Northwind portal: Reviewed Send approval'' and isdocument eq false and _createdby_value eq ', parameters('${APPROVAL_WRITER}'))`,
  })
  for (const key of [PORTAL_USER, PORTAL_URL, APPROVAL_WRITER]) assertEnvironmentVariable(publisher.parameters, key)
  for (const legacy of ['PortalApplicationUserId', 'PortalUrl', 'ApprovalWriterUserId']) assert.ok(!publisher.parameters[legacy], `${legacy} must come from an environment variable`)
  assert.equal(publishActions.Approval.inputs, "@json(triggerBody()?['notetext'])")
  assert.match(publishActions.Require_trusted_approval.expression, /_createdby_value.*ApprovalWriterUserId.*schemaVersion.*NativeSend.*outsideTransaction.*true.*_objectid_value.*caseId/)
  assert.equal(publishActions.Require_trusted_approval.actions.Stop_untrusted_approval.inputs.runStatus, 'Failed')
  assert.ok(!JSON.stringify(publisher).includes('sourceEmailId'))
  assert.ok(!JSON.stringify(publisher).includes('shared_approvals'))
  assert.ok(!publisher.parameters.ApproverObjectId)
})

test('publisher converts the approved snapshot without rereading mutable email content', () => {
  assert.equal(newPublication.Convert_approved_snapshot_to_text.inputs.host.operationId, 'HtmlToText')
  assert.equal(newPublication.Convert_approved_snapshot_to_text.inputs.parameters.Content, "@base64ToString(outputs('Approval')?['htmlBase64'])")
  assert.equal(newPublication.Approved_text.inputs, "@trim(body('Convert_approved_snapshot_to_text'))")
  assert.match(newPublication.Require_publishable_text.expression, /lessOrEquals\(length\(outputs\('Approved_text'\)\), 4000\)/)
  assert.ok(!JSON.stringify(publisher).includes('substring('))
  assert.ok(!JSON.stringify(publisher).includes('body/statuscode'))
  assert.ok(!JSON.stringify(publisher).includes('body/senton'))
  assert.equal(newPublication.Require_publishable_text.actions.Stop_invalid_approved_text.inputs.runStatus, 'Failed')
})

test('publisher derives the case and Contact from the trusted approval and rechecks their relationship', () => {
  assert.equal(publishActions.Read_case.inputs.parameters.recordId, "@outputs('Approval')?['caseId']")
  assert.deepEqual(publishActions.Read_case.runAfter, { Require_trusted_approval: ['Succeeded'] })
  assert.equal(publishActions.Read_case.inputs.parameters.$expand, 'customerid_contact($select=contactid)')
  assert.match(publishActions.Require_Northwind_personal_case.expression, /caseorigincode.*3/)
  assert.match(publishActions.Require_Northwind_personal_case.expression, /_createdby_value.*PortalApplicationUserId/)
  assert.match(publishActions.Require_Northwind_personal_case.expression, /not\(empty\(outputs\('Read_case'\)\?\['body\/customerid_contact'\]\?\['contactid'\]\)\)/)
  assert.match(publishActions.Require_Northwind_personal_case.expression, /customerid_contact.*outputs\('Approval'\).*contactId/)
  assert.equal(publishActions.Require_Northwind_personal_case.actions.Stop_changed_approved_case.inputs.runError.code, 'ApprovedCaseChanged')
  assert.deepEqual(publishActions.Find_publication_receipt.runAfter, { Require_Northwind_personal_case: ['Succeeded'] })
})

test('publication reserves by email ID but uses a separate activity ID and confirms before success', () => {
  assert.equal(newPublication.Reserve_publication.inputs.parameters['item/annotationid'], "@outputs('Approval')?['emailId']")
  assert.equal(newPublication.New_comment_id.inputs, '@guid()')
  assert.equal(newPublication.Create_portal_response.inputs.parameters['item/activityid'], "@outputs('New_comment_id')")
  assert.equal(newPublication.Create_portal_response.inputs.parameters['item/subject'], '*WEB* Reviewed support response')
  assert.equal(newPublication.Create_portal_response.inputs.parameters['item/adx_portalcommentdirectioncode'], 2)
  assert.equal(newPublication.Create_portal_response.inputs.parameters['item/description'], "@outputs('Publication_receipt')?['approvedText']")
  assert.equal(newPublication.Publication_receipt.inputs.schemaVersion, 4)
  assert.equal(newPublication.Publication_receipt.inputs.publicationMethod, 'NativeSend')
  assert.equal(newPublication.Publication_receipt.inputs.approvedText, "@outputs('Approved_text')")
  assert.equal(newPublication.Publication_receipt.inputs.sourceEmailVersion, "@outputs('Approval')?['sourceEmailVersion']")
  assert.equal(newPublication.Publication_receipt.inputs.approvalRequestId, "@triggerBody()?['annotationid']")
  assert.equal(newPublication.Publication_receipt.inputs.approvedBy, "@outputs('Approval')?['approvedBy']")
  assert.equal(newPublication.Publication_receipt.inputs.approvedAt, "@outputs('Approval')?['approvedAt']")
  assert.ok(!('sourceSentOn' in newPublication.Publication_receipt.inputs))
  assert.equal(newPublication.Reserve_publication.inputs.parameters['item/isdocument'], false)
  assert.ok(!newPublication.Reserve_publication.inputs.parameters['item/subject'].startsWith('*WEB*'))
  assert.deepEqual(newPublication.Create_portal_response.runAfter, { Reserve_publication: ['Succeeded'] })
  assert.deepEqual(newPublication.Complete_publication_receipt.runAfter, { Verify_published_response: ['Succeeded'] })
  assert.deepEqual(newPublication.Published.runAfter, { Complete_publication_receipt: ['Succeeded'] })
  assert.equal(newPublication.Published.type, 'Compose')
  assert.equal(newPublication.Published.inputs.status, 'Published')
  for (const action of [newPublication.Reserve_publication, newPublication.Create_portal_response]) assert.equal(action.inputs.retryPolicy.type, 'none')
  const replay = publishActions.Publication_exists.actions
  assert.match(replay.Require_matching_completed_receipt.expression, /schemaVersion.*NativeSend.*approvalRequestId.*schemaVersion.*SentEmail.*sourceSentOn.*schemaVersion'\], 1.*schemaVersion'\], 2.*approvalId.*approvedBy.*status.*Published.*emailId.*caseId.*contactId.*approvedText.*commentId/)
  assert.deepEqual(replay.Already_published.runAfter, { Verify_existing_response: ['Succeeded'] })
  assert.equal(replay.Already_published.type, 'Compose')
  assert.equal(replay.Already_published.inputs.status, 'AlreadyPublished')
  assert.match(replay.Verify_existing_response.expression, /Reviewed support response.*Support email response.*AI-assisted support response/)
})

test('mail rejection and draft edits cannot block an approved snapshot but changed case ownership can', () => {
  assert.match(newPublication.Require_unchanged_case_audience.expression, /caseorigincode.*_createdby_value.*customerid_contact.*Approval.*contactId/)
  assert.deepEqual(newPublication.Require_unchanged_case_audience.runAfter, { Read_case_before_publish: ['Succeeded'] })
  assert.deepEqual(newPublication.New_comment_id.runAfter, { Require_unchanged_case_audience: ['Succeeded'] })
  assert.equal(newPublication.Require_unchanged_case_audience.actions.Stop_changed_case_audience.inputs.runError.code, 'ApprovedCaseChanged')
  assert.ok(!JSON.stringify(newPublication).includes('statuscode'))
  assert.ok(!JSON.stringify(newPublication).includes('senton'))
})

test('publisher never sends a second email, edits the source or exposes a portal-callable entry point', () => {
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
          assert.ok(['GetItem', 'ListRecords', 'CreateRecord', 'UpdateOnlyRecord'].includes(input.host.operationId))
          assert.ok(!['emails', 'activityparties'].includes(input.parameters.entityName))
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
