# Changelog

All notable changes to the Harness Protocol specification are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The Harness Protocol uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for specification versions.

## [v1.0.0] — 2026-06-05

First stable release, promoting `v1.0.0-candidate` with the mid-2026 additions below. Backward-compatible: every change is an optional field or an additive enum value, so all existing `version: "1"` documents remain valid and the schema `$id` is unchanged. The `schema/draft/` schema is snapshotted to `schema/2026-06-05/` and published to `website/public/schema/v1/`.

### Added

- **Architectural constraints:** `architectural-constraints` section — deterministic linters, structural tests, and LLM review policies ([HEP-3](heps/hep-0003-architectural-constraints.md)).
- **Skills:** first-class top-level `skills` section, so a harness can declare a portable `SKILL.md` capability directly (by `source`/`version`, with `enabled`, `loading`, and `integrity`) without bundling it in a plugin ([HEP-4](heps/hep-0004-skills.md)).
- **MCP modernization:** `streamable-http` transport value (canonical remote transport; `http` retained as an alias), and optional `source`, `version`, and (stdio) `integrity` provenance fields on MCP server declarations ([HEP-5](heps/hep-0005-mcp-modernization.md)).
- **Governance:** `policy` section — an org/team ceiling for approved MCP server / plugin / skill sources, allowed marketplaces, permission caps, and `require-integrity`. Accumulates across the inheritance chain (constraints only tighten) and is enforced as a fatal validation step ([HEP-6](heps/hep-0006-governance-layer.md)).
- **Supply chain:** `integrity.sha256` extended to skills and stdio MCP server packages; `policy.require-integrity` can make integrity verification mandatory org-wide.

### Changed

- **Instructions:** `instructions.operational` now maps to `AGENTS.md` (the cross-tool instruction standard) as a first-class target alongside `CLAUDE.md` and other tool-specific files.
- **Application pipeline:** now seven steps — a dedicated **Enforce Policy** step runs after merge and before variable substitution.
- **Standards:** the overview now documents interoperation with the agent standards stack (AGENTS.md, Agent Skills / `SKILL.md`, the MCP registry) stewarded under the Agentic AI Foundation.

### Deprecated

- **MCP `sse` transport:** deprecated in favor of `streamable-http`; retained for compatibility. `ws` is documented as non-standard/implementation-specific. No transport value is removed.

## [v1.0.0-candidate] — 2026-04-18

**Status:** Feature-complete. Seeking implementation feedback before stabilization.

### Added

- **Plugin manifest:** `category` and `tags` fields for plugin discovery metadata.
- **Plugin manifest:** `mcp` field for plugins that bundle their own MCP servers (stdio transport).
- **Schema layer:** Complete `harness.yaml` format specification with JSON Schema validation.
- **Profile Schema:** Top-level sections for `metadata`, `plugins`, `mcp-servers`, `env`, `instructions`, `permissions`, and `extends`, plus `x-` extension prefix.
- **Plugin manifest:** `plugin.json` format for plugin authors, including `loading: deferred` for progressive skill disclosure.
- **MCP server declarations:** `stdio` and `http` transport types with `${VAR_NAME}` variable substitution.
- **Environment declarations:** `env` array with `sensitive`, `required`, `when`, and `default` fields. Schema-enforced prohibition of `sensitive: true` + `default`.
- **Instruction slots:** Three-slot model (`operational`, `behavioral`, `identity`) with `merge`, `replace`, and `skip` import modes.
- **Permission model:** `tools` (allow/deny/ask), `paths` (writable/readonly), and `network` (allowed-hosts) with inheritance-safe merge rules.
- **Inheritance:** `extends` with per-section merge semantics — intersection for allow lists, union for deny/ask/paths/network.
- **Fragments:** `kind: fragment` for partial harness documents designed for composition.
- **Source resolution:** `owner/repo` format with semver range matching against git tags.
- **Application semantics:** 6-step pipeline (Parse, Validate, Resolve, Merge, Substitute, Apply) with atomicity guarantees.
- **Security model:** Threat model, trust boundaries, secrets handling, integrity verification, and instruction injection mitigations.
- **JSON Schema:** Machine-readable schemas at `schema/draft/harness.schema.json` and `schema/draft/plugin.schema.json`.
- **Extension design sketches:** Exchange (v2), Registry (v2/v3), hooks, compiler targets, extension points.
- **Example profiles:** Minimal, data-engineer, team-overlay, fragment-mcp-server, fragment-plugin-bundle.
- **Community:** Contributing guide with HEP process, governance model, code of conduct, security policy.
