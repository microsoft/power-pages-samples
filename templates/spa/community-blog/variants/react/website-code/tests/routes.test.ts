import { describe, expect, it } from "vitest";
import { routes } from "../src/routes";

describe("route contract", () => {
  it("uses unique ids and paths", () => {
    expect(new Set(routes.map((route) => route.id)).size).toBe(routes.length);
    expect(new Set(routes.map((route) => route.path)).size).toBe(routes.length);
  });
});
