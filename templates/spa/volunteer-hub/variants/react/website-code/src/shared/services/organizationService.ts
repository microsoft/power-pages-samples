import {
  PowerPagesApiError,
  buildODataUrl,
  powerPagesFetch,
  type ODataCollectionResponse,
  type PaginatedResult,
} from "../powerPagesApi";
import {
  mapOrganizationEntity,
  type Organization,
  type OrganizationEntity,
} from "../../types/organization";

const ENTITY_SET = "vol_organizations";
const ORGANIZATION_SELECT = [
  "vol_organizationid",
  "vol_name",
  "vol_slug",
  "vol_focus",
  "vol_description",
].join(",");

export interface ListOrganizationsParams {
  pageSize?: number;
  nextLink?: string;
  signal?: AbortSignal;
}

const getPageSize = (pageSize?: number): number => {
  const requestedSize =
    typeof pageSize === "number" && Number.isFinite(pageSize)
      ? Math.trunc(pageSize)
      : 100;
  return Math.min(5_000, Math.max(1, requestedSize));
};

const normalizeRecordId = (id: string): string => {
  const normalized = id.trim().replace(/^\{|\}$/g, "");
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new TypeError("Organization ID must be a valid GUID.");
  }
  return normalized;
};

export const listOrganizations = async (
  params: ListOrganizationsParams = {},
): Promise<PaginatedResult<Organization>> => {
  const pageSize = getPageSize(params.pageSize);
  const url = params.nextLink ?? buildODataUrl(ENTITY_SET, {
    "$select": ORGANIZATION_SELECT,
    "$orderby": "vol_name asc",
    "$count": "true",
  });

  const response = await powerPagesFetch<ODataCollectionResponse<OrganizationEntity>>(url, {
    signal: params.signal,
    headers: {
      Prefer:
        `odata.include-annotations="OData.Community.Display.V1.FormattedValue",` +
        `odata.maxpagesize=${pageSize}`,
    },
  });

  return {
    items: (response?.value ?? []).map(mapOrganizationEntity),
    totalCount: response?.["@odata.count"] ?? response?.value?.length ?? 0,
    nextLink: response?.["@odata.nextLink"],
  };
};

export const getOrganizationById = async (
  id: string,
  signal?: AbortSignal,
): Promise<Organization | null> => {
  const url = buildODataUrl(`${ENTITY_SET}(${normalizeRecordId(id)})`, {
    "$select": ORGANIZATION_SELECT,
  });

  try {
    const entity = await powerPagesFetch<OrganizationEntity>(url, { signal });
    return entity ? mapOrganizationEntity(entity) : null;
  } catch (error) {
    if (error instanceof PowerPagesApiError && error.status === 404) return null;
    throw error;
  }
};
