# Harness Protocol

## Commands

### Docs site

```bash
cd website && npm run dev     # dev server at localhost:3000
cd website && npm run build   # production build; also the GitHub Actions deploy trigger
```

### Schema validation

```bash
# run from repo root

# Option A — check-jsonschema (Python)
pip install check-jsonschema
check-jsonschema --schemafile schema/draft/harness.schema.json examples/*.yaml

# Option B — ajv-cli (Node.js)
npm install -g ajv-cli
ajv validate -s schema/draft/harness.schema.json -d examples/minimal.harness.yaml
ajv validate -s schema/draft/plugin.schema.json  -d <path-to-plugin-manifest.json>
```

## Architecture

- **Spec-only repo.** No implementation code lives here. The reference implementation is in a separate repo.
- **JSON Schema is the source of truth.** `schema/draft/harness.schema.json` and `schema/draft/plugin.schema.json` are canonical. `website/public/schema/v1/*.json` is the published mirror — keep in sync on release.
- **Dual spec surfaces.** `protocol/*.md` is authoritative spec prose. `website/content/docs/specification/*.mdx` mirrors it for the docs site. Changing one without the other is a bug — always update both in the same commit.
- **Deployment.** GitHub Actions deploys to Cloudflare Workers on push to `main`. Never run `npm run deploy` locally — all deploys go through CI.
- **`heps/` directory.** Contains accepted HEPs. HEP-1 bootstrapped the process; new HEPs follow the format in CONTRIBUTING.md.

## Gotchas

- **`version: "1"` is a string, not an integer.** `version: 1` (integer) is a legacy format. The schema enforces this distinction via `const`.
- **`sensitive: true` is the default.** `sensitive: false` must be set explicitly. The `sensitive + default` combination is schema-forbidden — enforced via JSON Schema `if/then`.
- **`import-mode: "merge"` is the default.** `"replace"` must require user confirmation at apply time; `"skip"` silently ignores the section.
- **Fragments skip the `metadata` required check.** `kind: "fragment"` only requires `version` at the top level; `metadata` is optional.
- **`source: "owner/repo"` resolves from GitHub.** `./` prefix means local path. No other schemes in v1.
- **`$id` URLs are production-baked.** `https://harnessprotocol.io/schema/v1/...` — never change these without a spec version bump.
- **HEP required for normative changes.** Editorial changes (typos, wording, examples, formatting) go direct to PR. Any change that affects how a compliant implementation must behave requires a HEP.
- **Schema snapshots happen at release.** `schema/draft/` → `schema/YYYY-MM-DD/` when a version ships. The first release hasn't happened yet.
