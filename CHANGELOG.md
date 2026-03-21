# Changelog

All notable changes to the Harness Protocol specification are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The Harness Protocol uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for specification versions.

## [v1] — Unreleased (Candidate)

**Status:** Feature-complete. Seeking implementation feedback before stabilization.

### Added

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
