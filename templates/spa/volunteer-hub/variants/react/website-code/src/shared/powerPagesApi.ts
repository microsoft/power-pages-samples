// Centralized Power Pages Web API client with anti-forgery token management,
// retry handling, typed OData helpers, and file-column utilities.

let cachedAntiForgeryToken: string | null = null;
let antiForgeryTokenRequest: Promise<string> | null = null;

const fetchAntiForgeryToken = async (): Promise<string> => {
  if (cachedAntiForgeryToken !== null) return cachedAntiForgeryToken;
  if (antiForgeryTokenRequest) return antiForgeryTokenRequest;

  antiForgeryTokenRequest = (async () => {
    try {
      const response = await fetch("/_layout/tokenhtml");
      if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.status}`);
      }

      const tokenHtml = await response.text();
      const match = tokenHtml.match(
        /<input[^>]+name=["']__RequestVerificationToken["'][^>]+value=["']([^"']+)["']/i,
      ) ?? tokenHtml.match(
        /<input[^>]+value=["']([^"']+)["'][^>]+name=["']__RequestVerificationToken["']/i,
      );

      if (!match?.[1]) throw new Error("Token not found in response");
      cachedAntiForgeryToken = match[1];
      return cachedAntiForgeryToken;
    } catch (error) {
      // GET requests do not require the token, so callers can still perform reads.
      console.warn("Failed to fetch Power Pages anti-forgery token.", error);
      return "";
    } finally {
      antiForgeryTokenRequest = null;
    }
  })();

  return antiForgeryTokenRequest;
};

const invalidateAntiForgeryToken = (): void => {
  cachedAntiForgeryToken = null;
  antiForgeryTokenRequest = null;
};

export const buildPowerPagesHeaders = async (
  incoming?: HeadersInit,
  options?: { accept?: string | null; contentType?: string | null; prefer?: string | null },
): Promise<Headers> => {
  const headers = new Headers({
    __RequestVerificationToken: await fetchAntiForgeryToken(),
  });

  if (options?.accept !== null) {
    headers.set("Accept", options?.accept ?? "application/json");
  }
  if (options?.contentType !== null) {
    headers.set("Content-Type", options?.contentType ?? "application/json");
  }
  if (options?.prefer !== null) {
    headers.set(
      "Prefer",
      options?.prefer ??
        'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
    );
  }

  if (incoming) {
    new Headers(incoming).forEach((value, key) => headers.set(key, value));
  }

  return headers;
};

export const parseResponseBody = async <T>(response: Response): Promise<T | null> => {
  if (response.status === 202 || response.status === 204) return null;

  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Power Pages Web API returned an invalid JSON response.");
  }
};

export const extractRecordId = (response: Response): string | null => {
  const location = response.headers.get("Location") ?? response.headers.get("OData-EntityId");
  const match = location?.match(/\(([0-9a-f-]{36})\)/i);
  return match?.[1] ?? null;
};

export const WebApiErrorCode = {
  ReadPermissionDenied: "90040120",
  WritePermissionDenied: "90040102",
  CreatePermissionDenied: "90040103",
  DeletePermissionDenied: "90040104",
  AppendPermissionDenied: "90040105",
  AppendToPermissionDenied: "90040106",
  AntiForgeryTokenInvalid: "90040107",
  ResourceNotFound: "9004010c",
  CdsError: "9004010d",
} as const;

export class PowerPagesApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PowerPagesApiError";
    this.status = status;
    this.code = code?.toLowerCase();
  }
}

interface ErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

const readErrorPayload = async (response: Response): Promise<ErrorPayload | null> => {
  try {
    return await response.json() as ErrorPayload;
  } catch {
    return null;
  }
};

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

const sleep = (milliseconds: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });

const isTransientError = (status: number): boolean =>
  status === 429 || (status >= 500 && status < 600);

const getRetryDelay = (response: Response, attempt: number): number => {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  }
  return INITIAL_RETRY_DELAY_MS * (2 ** (attempt - 1));
};

const throwResponseError = async (response: Response): Promise<never> => {
  const payload = await readErrorPayload(response);
  const message = payload?.error?.message || `Request failed with status ${response.status}`;
  throw new PowerPagesApiError(message, response.status, payload?.error?.code);
};

const executeRequest = async (
  url: string,
  options?: RequestInit & { signal?: AbortSignal },
): Promise<Response> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const headers = await buildPowerPagesHeaders(options?.headers);
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      throw new PowerPagesApiError("Session expired. Please sign in again.", 401);
    }

    if (response.status === 403) {
      const payload = await readErrorPayload(response.clone());
      const code = payload?.error?.code?.toLowerCase();
      if (
        code === WebApiErrorCode.AntiForgeryTokenInvalid &&
        attempt < MAX_RETRIES
      ) {
        invalidateAntiForgeryToken();
        continue;
      }
    }

    if (isTransientError(response.status) && attempt < MAX_RETRIES) {
      await sleep(getRetryDelay(response, attempt), options?.signal);
      continue;
    }

    if (!response.ok) await throwResponseError(response);
    return response;
  }

  throw new Error("Maximum Power Pages Web API retries exceeded.");
};

export async function powerPagesFetch<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal },
): Promise<T | null> {
  return parseResponseBody<T>(await executeRequest(url, options));
}

export const powerPagesFetchResponse = (
  url: string,
  options?: RequestInit & { signal?: AbortSignal },
): Promise<Response> => executeRequest(url, options);

export const parseErrorCode = (error: unknown): string | undefined => {
  if (error instanceof PowerPagesApiError && error.code) return error.code;
  if (error instanceof Error) return error.message.match(/[0-9a-f]{8}/i)?.[0]?.toLowerCase();
  return undefined;
};

export const isPermissionError = (error: unknown): boolean => {
  const code = parseErrorCode(error);
  const permissionCodes: readonly string[] = [
    WebApiErrorCode.ReadPermissionDenied,
    WebApiErrorCode.WritePermissionDenied,
    WebApiErrorCode.CreatePermissionDenied,
    WebApiErrorCode.DeletePermissionDenied,
    WebApiErrorCode.AppendPermissionDenied,
    WebApiErrorCode.AppendToPermissionDenied,
  ];
  return code !== undefined && permissionCodes.includes(code);
};

export const buildODataUrl = (
  entitySet: string,
  query?: Record<string, string | undefined>,
): string => {
  if (!query) return `/_api/${entitySet}`;

  const queryString = Object.entries(query)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/gi, ",")}`)
    .join("&");

  return queryString ? `/_api/${entitySet}?${queryString}` : `/_api/${entitySet}`;
};

export const escapeODataString = (value: string): string => value.replace(/'/g, "''");

export interface ODataCollectionResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  nextLink?: string;
}

export interface ExpandedCollection<T> {
  items: T[];
  nextLink?: string;
}

export const parseExpandedCollection = <T>(
  entity: Record<string, unknown>,
  property: string,
): ExpandedCollection<T> => ({
  items: Array.isArray(entity[property]) ? entity[property] as T[] : [],
  nextLink: entity[`${property}@odata.nextLink`] as string | undefined,
});

export const getFormattedValue = (
  record: Record<string, unknown>,
  logicalName: string,
): string | undefined =>
  record[`${logicalName}@OData.Community.Display.V1.FormattedValue`] as string | undefined;

const MAX_PAGINATION_ITERATIONS = 100;

export const fetchAllPages = async <T>(
  initialUrl: string,
  pageSize = 100,
  signal?: AbortSignal,
): Promise<T[]> => {
  let nextUrl: string | undefined = initialUrl;
  const results: T[] = [];

  for (let iteration = 0; nextUrl && iteration < MAX_PAGINATION_ITERATIONS; iteration += 1) {
    const response: ODataCollectionResponse<T> | null =
      await powerPagesFetch<ODataCollectionResponse<T>>(nextUrl, {
      signal,
      headers: {
        Prefer:
          `odata.include-annotations="OData.Community.Display.V1.FormattedValue",` +
          `odata.maxpagesize=${pageSize}`,
      },
    });
    if (!response) break;
    results.push(...(response.value ?? []));
    nextUrl = response["@odata.nextLink"];
  }

  if (nextUrl) console.error("Exceeded maximum Power Pages pagination iterations.");
  return results;
};

export const bindLookup = (
  body: Record<string, unknown>,
  navigationProperty: string,
  entitySetName: string,
  id?: string | null,
): void => {
  if (id === null) {
    body[`${navigationProperty}@odata.bind`] = null;
  } else if (id) {
    body[`${navigationProperty}@odata.bind`] = `/${entitySetName}(${id})`;
  }
};

export interface ExpandOption {
  property: string;
  select?: string[];
  filter?: string;
  orderBy?: string;
  top?: number;
  expand?: ExpandOption[];
}

const formatExpandOption = (option: ExpandOption): string => {
  const parts: string[] = [];
  if (option.select?.length) parts.push(`$select=${option.select.join(",")}`);
  if (option.filter) parts.push(`$filter=${option.filter}`);
  if (option.orderBy) parts.push(`$orderby=${option.orderBy}`);
  if (option.top !== undefined) parts.push(`$top=${option.top}`);
  if (option.expand?.length) parts.push(`$expand=${buildExpandClause(option.expand)}`);
  return parts.length ? `${option.property}(${parts.join(";")})` : option.property;
};

export const buildExpandClause = (options: ExpandOption[]): string =>
  options.map(formatExpandOption).join(",");

export const fetchFileColumnUrl = async (
  table: string,
  recordId: string,
  column: string,
): Promise<string | null> => {
  const headers = await buildPowerPagesHeaders(undefined, {
    accept: "*/*",
    contentType: "application/octet-stream",
    prefer: null,
  });
  const response = await fetch(`/_api/${table}(${recordId})/${column}/$value`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) await throwResponseError(response);
  return URL.createObjectURL(await response.blob());
};

export const uploadFileColumn = async (
  table: string,
  recordId: string,
  column: string,
  file: Blob,
  fileName?: string,
): Promise<void> => {
  const headers = await buildPowerPagesHeaders(
    {
      "If-Match": "*",
      ...(fileName ? { "x-ms-file-name": fileName } : {}),
    },
    { accept: "application/json", contentType: "application/octet-stream", prefer: null },
  );
  const response = await fetch(`/_api/${table}(${recordId})/${column}`, {
    method: "PATCH",
    headers,
    body: await file.arrayBuffer(),
  });
  if (!response.ok) await throwResponseError(response);
};

export const deleteFileColumn = async (
  table: string,
  recordId: string,
  column: string,
): Promise<void> => {
  const headers = await buildPowerPagesHeaders({ "If-Match": "*" });
  const response = await fetch(`/_api/${table}(${recordId})/${column}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok && response.status !== 404) await throwResponseError(response);
};
