import routeData from "./routes.json";

export const routes = routeData as readonly {
  id: string;
  path: string;
  displayName: string;
  summary: string;
}[];

export type TemplateRoute = (typeof routes)[number];
