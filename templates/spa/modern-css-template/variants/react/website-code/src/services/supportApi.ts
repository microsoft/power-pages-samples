export type ProfileDto = {
  id: string; firstName: string; lastName: string; email: string; phone: string; address: string
  account: { id: string; name: string } | null
}
export type CaseDto = {
  id: string; number: string; title: string; description: string; state: number; status: number
  created: string; updated: string
}
export type KnowledgeDto = { id: string; number: string; title: string; description: string; content: string }
export type CaseDocument = { id: string; name: string; type: string; size?: number }
export type CaseActivity = {
  comments: { id: string; subject?: string; body: string; created: string; author: string }[]
  documents: CaseDocument[]
}
export type CatalogItem = { id: string; name: string }
type RecordValue = Record<string, unknown>
type Decoder<T> = (value: unknown) => T
type Endpoint = 'northwind-profile' | 'northwind-cases' | 'northwind-knowledge' | 'northwind-case-activity' | 'northwind-feedback'

export class SupportApiError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) { super(message); this.name = 'SupportApiError' }
}

function invalid(): never { throw new SupportApiError('The support service returned an invalid response. Please try again or contact the site administrator.', 'INVALID_RESPONSE') }
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
  return value as RecordValue
}
function text(value: unknown): string { return typeof value === 'string' ? value : invalid() }
function number(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) ? value : invalid() }
function id(value: unknown): string {
  const result = text(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result) ? result : invalid()
}
function date(value: unknown): string { const result = text(value); return Number.isFinite(Date.parse(result)) ? result : invalid() }
function array<T>(value: unknown, decode: Decoder<T>): T[] { return Array.isArray(value) ? value.map(decode) : invalid() }
function json(value: string): unknown {
  try { return JSON.parse(value) } catch { return invalid() }
}
const profileDto: Decoder<ProfileDto> = value => {
  const r = record(value)
  const account = r.account === null ? null : record(r.account)
  return { id: id(r.id), firstName: text(r.firstName), lastName: text(r.lastName), email: text(r.email), phone: text(r.phone), address: text(r.address), account: account && { id: id(account.id), name: text(account.name) } }
}
const caseDto: Decoder<CaseDto> = value => {
  const r = record(value), state = number(r.state)
  if (![0, 1, 2].includes(state)) return invalid()
  return { id: id(r.id), number: text(r.number), title: text(r.title), description: text(r.description), state, status: number(r.status), created: date(r.created), updated: date(r.updated) }
}
const knowledgeDto: Decoder<KnowledgeDto> = value => {
  const r = record(value)
  return { id: id(r.id), number: text(r.number), title: text(r.title), description: text(r.description), content: text(r.content) }
}
const documentDto: Decoder<CaseDocument> = value => {
  const r = record(value)
  return { id: id(r.id), name: text(r.name), type: text(r.type) }
}
const activityDto: Decoder<CaseActivity> = value => {
  const r = record(value)
  return {
    comments: array(r.comments, value => { const c = record(value); return { id: id(c.id), subject: c.subject == null ? '' : text(c.subject), body: text(c.body), created: date(c.created), author: text(c.author) } }),
    documents: array(r.documents, documentDto),
  }
}
const createdDto = (value: unknown) => ({ id: id(record(value).id) })
const activityCreatedDto = (value: unknown) => {
  const r = record(value)
  return { id: id(r.id), statusChanged: r.statusChanged === true }
}
export type CaseActivityCreated = ReturnType<typeof activityCreatedDto> & {
  processingConfirmed?: boolean
  warning?: string
}
// Leaves room for the dispatch flow to append the 102-character portal case link line.
export const caseDetailsLimit = 1898

export const attachmentProcessingWarning = 'The attachment was saved, but protected post-save processing is unconfirmed. Reload this case to check the documents and status before taking further action. Do not upload the same file again.'

let csrfToken: Promise<string> | undefined
async function token(): Promise<string> {
  if (!csrfToken) csrfToken = (async () => {
    const response = await fetch('/_layout/tokenhtml', { credentials: 'same-origin', headers: { Accept: 'text/html' } })
    if (!response.ok) throw new SupportApiError('Your support session is unavailable. Sign in and try again.', 'UNAUTHENTICATED', response.status)
    const page = new DOMParser().parseFromString(await response.text(), 'text/html')
    const result = page.querySelector<HTMLInputElement>('input[name="__RequestVerificationToken"]')?.value
    if (!result) throw new SupportApiError('The portal verification token is unavailable. Open this application on its Power Pages website.', 'SESSION_UNAVAILABLE')
    return result
  })().catch(error => { csrfToken = undefined; throw error })
  return csrfToken
}
export { token as getCsrfToken }
async function responseJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) csrfToken = undefined
    const message = response.status === 401 ? 'Sign in to access your support records.'
      : response.status === 403 ? 'Your account does not have permission for this operation.'
      : response.status === 404 ? 'The support endpoint is not available. The integration may not have been deployed yet.'
      : 'The support service could not complete the request. Please try again.'
    throw new SupportApiError(message, response.status === 401 ? 'UNAUTHENTICATED' : response.status === 403 ? 'FORBIDDEN' : 'HTTP_ERROR', response.status)
  }
  return json(await response.text())
}
async function request<T>(endpoint: Endpoint, decode: Decoder<T>, method = 'GET', body?: unknown, parameters?: Record<string, string>): Promise<T> {
  const query = parameters ? `?${new URLSearchParams(parameters)}` : ''
  const response = await fetch(`/_api/serverlogics/${endpoint}${query}`, {
    method, credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', __RequestVerificationToken: await token() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const outer = record(await responseJson(response))
  if ((outer.success ?? outer.Success) !== true) throw new SupportApiError('The portal could not execute the support operation. Please try again or contact the site administrator.', 'EXECUTION_ERROR')
  const raw = outer.data ?? outer.Data
  const payload = record(typeof raw === 'string' ? json(raw) : raw)
  if (payload.status === 'error') throw new SupportApiError(text(payload.message), text(payload.code))
  if (payload.status !== 'success') return invalid()
  return decode(payload.data)
}
async function pages<T>(endpoint: 'northwind-knowledge', decode: Decoder<T>): Promise<T[]> {
  const result: T[] = [], cursors = new Set<string>()
  let cursor: string | null = null
  do {
    const page: { items: T[]; cursor: string | null } = await request(endpoint, value => {
      const r = record(value)
      return { items: array(r.items, decode), cursor: r.cursor === null ? null : text(r.cursor) }
    }, 'GET', undefined, cursor === null ? undefined : { cursor })
    result.push(...page.items)
    cursor = page.cursor
    if (cursor !== null) {
      if (!cursor || cursors.has(cursor)) throw new SupportApiError('The service returned an invalid page cursor. Records could not be fully loaded.', 'INVALID_PAGINATION')
      cursors.add(cursor)
    }
  } while (cursor !== null)
  return result
}
async function webApiPages<T>(entity: 'products' | 'categories' | 'incidents', query: string, decode: Decoder<T>): Promise<T[]> {
  let url: string | null = `/_api/${entity}?${query}`
  const seen = new Set<string>(), result: T[] = []
  while (url !== null) {
    const parsed = new URL(url, location.origin)
    if (parsed.origin !== location.origin || parsed.pathname !== `/_api/${entity}` || parsed.hash || parsed.username || parsed.password || seen.has(parsed.href)) throw new SupportApiError('The service returned an invalid continuation link.', 'INVALID_PAGINATION')
    seen.add(parsed.href)
    const data = record(await responseJson(await fetch(parsed.href, { credentials: 'same-origin', headers: { Accept: 'application/json', __RequestVerificationToken: await token() } })))
    result.push(...array(data.value, decode))
    url = data['@odata.nextLink'] == null ? null : text(data['@odata.nextLink'])
  }
  return result
}
function catalog(entity: 'products' | 'categories'): Promise<CatalogItem[]> {
  const key = entity === 'products' ? 'productid' : 'categoryid'
  const name = entity === 'products' ? 'name' : 'title'
  return webApiPages(entity, `$select=${key},${name}${entity === 'products' ? ',statecode&$filter=statecode eq 0' : ''}&$orderby=${name}`, value => {
    const r = record(value)
    return { id: id(r[key]), name: text(r[name]) }
  })
}
const caseFields = 'incidentid,ticketnumber,title,description,statecode,statuscode,createdon,modifiedon,_customerid_value'
function webApiCase(value: unknown, contactId: string): CaseDto {
  const r = record(value)
  if (id(r._customerid_value).toLowerCase() !== id(contactId).toLowerCase()) return invalid()
  return caseDto({
    id: r.incidentid, number: r.ticketnumber, title: r.title, description: r.description ?? '',
    state: r.statecode, status: r.statuscode, created: r.createdon, updated: r.modifiedon,
  })
}
async function getCase(caseId: string, contactId: string): Promise<CaseDto> {
  const response = await fetch(`/_api/incidents(${id(caseId)})?$select=${caseFields}`, {
    credentials: 'same-origin', headers: { Accept: 'application/json', __RequestVerificationToken: await token() },
  })
  const item = webApiCase(await responseJson(response), contactId)
  if (item.id.toLowerCase() !== caseId.toLowerCase()) return invalid()
  return item
}
function unconfirmedCase(): never {
  throw new SupportApiError('Case creation could not be confirmed. Reload your cases before submitting again.', 'CREATE_UNCONFIRMED')
}
async function createCase(contactId: string, description: string, impact: string, productId?: string): Promise<CaseDto> {
  const details = `${description.trim()}\n\nBusiness impact: ${impact}`
  if (!description.trim() || details.length > caseDetailsLimit || !['Work is blocked', 'Service is impaired', 'I have a question'].includes(impact) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(details)) {
    throw new SupportApiError('Check the case details. Description and business impact together must fit within 1,898 characters.', 'VALIDATION')
  }
  const body = {
    title: description.trim().split(/[\r\n]/)[0].slice(0, 200), description: details,
    caseorigincode: 3, // Web
    'customerid_contact@odata.bind': `/contacts(${id(contactId)})`,
    ...(productId ? { 'productid@odata.bind': `/products(${id(productId)})` } : {}),
  }
  const verification = await token()
  let response: Response
  try {
    response = await fetch('/_api/incidents', {
      method: 'POST', credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', __RequestVerificationToken: verification },
      body: JSON.stringify(body),
    })
  } catch { return unconfirmedCase() }
  if (!response.ok) {
    if (response.status >= 500 || response.status === 408) return unconfirmedCase()
    await responseJson(response)
  }
  try {
    const header = response.headers.get('entityid') || response.headers.get('odata-entityid')
    const createdId = header?.startsWith('{') && header.endsWith('}') ? header.slice(1, -1)
      : header?.match(/\/incidents\(([^()]+)\)$/i)?.[1] ?? header
    return await getCase(id(createdId), contactId)
  } catch { return unconfirmedCase() }
}
async function fileContent(file: File): Promise<string> {
  if (!attachmentType(file.name) || !file.size || file.size > 3_932_160) throw new SupportApiError('Choose a nonempty PDF, Word, PNG, JPEG, GIF or ZIP file up to 3.75 MiB (3,932,160 bytes).', 'VALIDATION')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new SupportApiError('The selected file could not be read.', 'FILE_READ_ERROR'))
    reader.onload = () => {
      const value = reader.result
      if (typeof value !== 'string' || !value.includes(',')) reject(new SupportApiError('The selected file could not be encoded.', 'FILE_READ_ERROR'))
      else resolve(value.slice(value.indexOf(',') + 1))
    }
    reader.readAsDataURL(file)
  })
}
const attachmentTypes: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', zip: 'application/zip',
}
function attachmentType(name: string): string | undefined {
  const extension = name.match(/\.([^.]+)$/)?.[1].toLowerCase()
  return extension && Object.prototype.hasOwnProperty.call(attachmentTypes, extension) ? attachmentTypes[extension] : undefined
}
function unconfirmedAttachment(): never {
  throw new SupportApiError('The upload is unconfirmed. Reload this case and check its documents before retrying; the file may already have been saved.', 'UPLOAD_UNCONFIRMED')
}
async function upload(caseId: string, file: File): Promise<CaseActivityCreated> {
  const authorizedCaseId = id(caseId)
  const documentbody = await fileContent(file)
  const verification = await token()
  const commentId = crypto.randomUUID(), documentId = crypto.randomUUID()
  // One native deep insert only. Retrying an ambiguous write can duplicate the attachment.
  let response: Response
  try {
    response = await fetch('/_api/adx_portalcomments', {
      method: 'POST', credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', __RequestVerificationToken: verification },
      body: JSON.stringify({
        activityid: commentId, description: 'Attachment uploaded: ' + file.name + '\nDocument reference: ' + documentId,
        'regardingobjectid_incident_adx_portalcomment@odata.bind': `/incidents(${authorizedCaseId})`,
        adx_portalcomment_Annotations: [{
          annotationid: documentId, filename: file.name, mimetype: attachmentType(file.name),
          isdocument: true, notetext: '*WEB* Customer-uploaded document', documentbody,
        }],
      }),
    })
  } catch { return unconfirmedAttachment() }
  if (!response.ok) {
    if (response.status >= 500 || response.status === 408) return unconfirmedAttachment()
    await responseJson(response)
  }
  // A 204 has no JSON body. HTTP success alone is not persistence proof:
  // Server Logic must verify BOTH assigned rows and their authorized relationship.
  try {
    const receipt = await request('northwind-case-activity', value => {
      const r = record(value)
      if (id(r.id).toLowerCase() !== documentId.toLowerCase() ||
        typeof r.statusChanged !== 'boolean' || typeof r.processingConfirmed !== 'boolean') return invalid()
      return { id: documentId, statusChanged: r.statusChanged, processingConfirmed: r.processingConfirmed }
    }, 'POST', { caseId: authorizedCaseId, kind: 'attachmentReceipt', commentId, documentId })
    return { ...receipt, ...(receipt.processingConfirmed ? {} : { warning: attachmentProcessingWarning }) }
  } catch {
    // HTTP acceptance is not persistence proof. Never invite another native write.
    return { id: documentId, statusChanged: false, processingConfirmed: false,
      warning: 'The native write was accepted, but attachment persistence and protected processing remain unconfirmed. Reload this case to check its documents and status. Do not upload the same file again.' }
  }
}
// Notes attached to portal comments can only be read by a direct single-record Web API GET.
// Server Logic supplies the note IDs referenced by this case's customer comments.
async function annotation(documentId: string, columns: string): Promise<RecordValue | null> {
  const response = await fetch(`/_api/annotations(${id(documentId)})?$select=${columns}`, {
    credentials: 'same-origin', headers: { Accept: 'application/json', __RequestVerificationToken: await token() },
  })
  if (response.status === 403 || response.status === 404) return null
  return record(await responseJson(response))
}
function sameDocument(note: RecordValue | null, document: CaseDocument): boolean {
  return !!note && typeof note.annotationid === 'string' && note.annotationid.toLowerCase() === document.id.toLowerCase() &&
    note.isdocument === true && typeof note.notetext === 'string' && note.notetext.startsWith('*WEB*') &&
    note.filename === document.name && attachmentType(document.name) === document.type
}
async function activity(caseId: string): Promise<CaseActivity> {
  const result = await request('northwind-case-activity', activityDto, 'GET', undefined, { caseId: id(caseId) })
  const notes = await Promise.all(result.documents.map(document =>
    annotation(document.id, 'annotationid,filename,mimetype,isdocument,notetext')))
  return { ...result, documents: result.documents.filter((document, index) => sameDocument(notes[index], document)) }
}
async function download(caseId: string, documentId: string): Promise<{ name: string; type: string; bytes: Uint8Array<ArrayBuffer> }> {
  const key = id(documentId).toLowerCase()
  const document = (await request('northwind-case-activity', activityDto, 'GET', undefined, { caseId: id(caseId) }))
    .documents.find(item => item.id.toLowerCase() === key)
  if (!document) throw new SupportApiError('The document is no longer available on this case.', 'NOT_FOUND')
  const note = await annotation(key, 'annotationid,filename,mimetype,isdocument,notetext,documentbody')
  if (!note || !sameDocument(note, document)) throw new SupportApiError('The document is no longer available on this case.', 'NOT_FOUND')
  const name = document.name, type = document.type, mime = text(note.mimetype).toLowerCase(), content = text(note.documentbody)
  if (mime !== type && !(type === 'application/zip' && mime === 'application/x-zip-compressed')) {
    throw new SupportApiError('The server returned an unsupported document type.', 'INVALID_DOCUMENT')
  }
  if (!content || content.length > 4 * Math.ceil(5 * 1024 * 1024 / 3) ||
    content.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(content)) {
    throw new SupportApiError('The document content is invalid or exceeds the 5 MiB download limit.', 'INVALID_DOCUMENT')
  }
  let binary: string
  try { binary = atob(content) } catch { return invalid() }
  if (binary.length > 5 * 1024 * 1024 || btoa(binary) !== content) return invalid()
  return { name, type, bytes: Uint8Array.from(binary, character => character.charCodeAt(0)) }
}
export const supportApi = {
  profile: () => request('northwind-profile', profileDto),
  saveProfile: (body: Pick<ProfileDto, 'firstName' | 'lastName' | 'phone'>) => request('northwind-profile', profileDto, 'PATCH', body),
  cases: (contactId: string) => webApiPages('incidents', `$select=${caseFields}&$filter=_customerid_value eq ${id(contactId)}&$orderby=createdon desc,incidentid asc`, value => webApiCase(value, contactId)),
  articles: () => pages('northwind-knowledge', knowledgeDto),
  products: () => catalog('products'),
  categories: () => catalog('categories'),
  createCase,
  getCase,
  updateCase: (caseId: string, title: string, description: string) => request('northwind-cases', caseDto, 'PATCH', { id: caseId, title, description }),
  activity,
  comment: (caseId: string, body: string) => request('northwind-case-activity', activityCreatedDto, 'POST', { caseId, kind: 'comment', body }),
  upload,
  download,
  articleFeedback: (articleId: string, helpful: boolean) => request('northwind-feedback', createdDto, 'POST', { kind: 'article', articleId, helpful }),
  contact: (message: string) => request('northwind-feedback', createdDto, 'POST', { kind: 'contact', message }),
}
