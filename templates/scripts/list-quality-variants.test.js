"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { listQualityVariants } = require("./list-quality-variants");

test("lists quality-standard variants in stable order", () => {
  const result = listQualityVariants({
    templates: [
      {
        id: "legacy",
        kind: "spa",
        variants: { react: {} }
      },
      {
        id: "zeta",
        kind: "spa",
        qualityStandard: 1,
        seedDataPath: "spa/zeta/seed-data/data.json",
        variants: { react: {} }
      },
      {
        id: "alpha",
        kind: "spa",
        qualityStandard: 1,
        seedDataPath: "spa/alpha/seed-data/data.json",
        variants: { react: {} }
      }
    ]
  });

  assert.deepEqual(result, [
    {
      id: "alpha",
      framework: "react",
      path: "templates/spa/alpha/variants/react/website-code",
      seedDataPath: "spa/alpha/seed-data/data.json",
      skip: false
    },
    {
      id: "zeta",
      framework: "react",
      path: "templates/spa/zeta/variants/react/website-code",
      seedDataPath: "spa/zeta/seed-data/data.json",
      skip: false
    }
  ]);
});
