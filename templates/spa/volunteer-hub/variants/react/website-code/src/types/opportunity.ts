import {
  mapOrganizationEntity,
  type Organization,
  type OrganizationEntity,
} from "./organization";

export type OpportunityTone = "coral" | "blue" | "green" | "gold";

export interface OpportunityEntity {
  vol_opportunityid: string;
  vol_title?: string;
  vol_slug?: string;
  vol_category?: string;
  vol_place?: string;
  vol_commitment?: string;
  vol_summary?: string;
  vol_featured?: boolean;
  _vol_organizationid_value?: string;
  vol_OrganizationId?: OrganizationEntity | null;
  [key: string]: unknown;
}

export interface Opportunity {
  id: string;
  title: string;
  slug: string;
  category: string;
  location: string;
  commitment: string;
  summary: string;
  featured: boolean;
  organizationId: string;
  organization?: Organization;
  tone: OpportunityTone;
}

const OPPORTUNITY_TONES: readonly OpportunityTone[] = [
  "coral",
  "blue",
  "green",
  "gold",
];

const getToneFromCategory = (category: string): OpportunityTone => {
  const normalizedCategory = category.trim().toLowerCase();
  const hash = Array.from(normalizedCategory).reduce(
    (currentHash, character) =>
      ((currentHash * 31) + (character.codePointAt(0) ?? 0)) >>> 0,
    0,
  );
  return OPPORTUNITY_TONES[hash % OPPORTUNITY_TONES.length];
};

export const mapOpportunityEntity = (
  entity: OpportunityEntity,
): Opportunity => {
  const category = entity.vol_category?.trim() ?? "";
  const organizationEntity = entity.vol_OrganizationId;

  return {
    id: entity.vol_opportunityid ?? "",
    title: entity.vol_title ?? "",
    slug: entity.vol_slug ?? "",
    category,
    location: entity.vol_place ?? "",
    commitment: entity.vol_commitment ?? "",
    summary: entity.vol_summary ?? "",
    featured: entity.vol_featured === true,
    organizationId: entity._vol_organizationid_value ?? "",
    organization: organizationEntity
      ? mapOrganizationEntity(organizationEntity)
      : undefined,
    tone: getToneFromCategory(category),
  };
};
