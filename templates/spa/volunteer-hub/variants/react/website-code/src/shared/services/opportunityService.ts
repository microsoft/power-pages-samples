import {
  PowerPagesApiError,
  buildExpandClause,
  buildODataUrl,
  powerPagesFetch,
  type ODataCollectionResponse,
  type PaginatedResult,
} from "../powerPagesApi";
import {
  mapOpportunityEntity,
  type Opportunity,
  type OpportunityEntity,
} from "../../types/opportunity";

const ENTITY_SET = "vol_opportunities";
const OPPORTUNITY_SELECT = [
  "vol_opportunityid",
  "vol_title",
  "vol_slug",
  "vol_category",
  "vol_place",
  "vol_commitment",
  "vol_summary",
  "vol_featured",
  "_vol_organizationid_value",
].join(",");
const OPPORTUNITY_EXPAND = buildExpandClause([
  {
    property: "vol_OrganizationId",
    select: [
      "vol_organizationid",
      "vol_name",
      "vol_slug",
      "vol_focus",
      "vol_description",
    ],
  },
]);

export interface ListOpportunitiesParams {
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
    throw new TypeError("Opportunity ID must be a valid GUID.");
  }
  return normalized;
};

export const listOpportunities = async (
  params: ListOpportunitiesParams = {},
): Promise<PaginatedResult<Opportunity>> => {
  const pageSize = getPageSize(params.pageSize);
  const url = params.nextLink ?? buildODataUrl(ENTITY_SET, {
    "$select": OPPORTUNITY_SELECT,
    "$expand": OPPORTUNITY_EXPAND,
    "$orderby": "vol_featured desc,vol_title asc",
    "$count": "true",
  });

  const response = await powerPagesFetch<ODataCollectionResponse<OpportunityEntity>>(url, {
    signal: params.signal,
    headers: {
      Prefer:
        `odata.include-annotations="OData.Community.Display.V1.FormattedValue",` +
        `odata.maxpagesize=${pageSize}`,
    },
  });

  return {
    items: (response?.value ?? []).map(mapOpportunityEntity),
    totalCount: response?.["@odata.count"] ?? response?.value?.length ?? 0,
    nextLink: response?.["@odata.nextLink"],
  };
};

export const getOpportunityById = async (
  id: string,
  signal?: AbortSignal,
): Promise<Opportunity | null> => {
  const url = buildODataUrl(`${ENTITY_SET}(${normalizeRecordId(id)})`, {
    "$select": OPPORTUNITY_SELECT,
    "$expand": OPPORTUNITY_EXPAND,
  });

  try {
    const entity = await powerPagesFetch<OpportunityEntity>(url, { signal });
    return entity ? mapOpportunityEntity(entity) : null;
  } catch (error) {
    if (error instanceof PowerPagesApiError && error.status === 404) return null;
    throw error;
  }
};
