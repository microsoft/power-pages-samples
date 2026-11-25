export interface OrganizationEntity {
  vol_organizationid: string;
  vol_name?: string;
  vol_slug?: string;
  vol_focus?: string;
  vol_description?: string;
  [key: string]: unknown;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  focus: string;
  description: string;
  initials: string;
}

const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toLocaleUpperCase();

export const mapOrganizationEntity = (
  entity: OrganizationEntity,
): Organization => {
  const name = entity.vol_name ?? "";
  return {
    id: entity.vol_organizationid ?? "",
    name,
    slug: entity.vol_slug ?? "",
    focus: entity.vol_focus ?? "",
    description: entity.vol_description ?? "",
    initials: getInitials(name),
  };
};
