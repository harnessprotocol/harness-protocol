# Changelog

All notable changes to the Harness Protocol specification are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The Harness Protocol uses date-based schema versioning: `schema/draft/` for work in progress, `schema/YYYY-MM-DD/` for releases.

## [Unreleased]

### Added

- `harness.yaml` v1 schema: top-level sections (`version`, `kind`, `metadata`, `plugins`, `mcp-servers`, `env`, `instructions`, `permissions`, `extends`), `x-` extension prefix, backward compatibility with legacy integer format
- JSON Schema: `schema/draft/harness.schema.json` — machine-readable validation with `$schema` URI support for editor autocomplete
- JSON Schema: `schema/draft/plugin.schema.json` — plugin manifest validation
- Protocol documentation: `protocol/overview.md`, `protocol/terminology.md`, `protocol/architecture.md`
- Protocol documentation: `protocol/profile-schema.md` — full field reference for all v1 sections
- Protocol documentation: `protocol/plugin-manifest.md`, `protocol/mcp-declarations.md`, `protocol/instructions.md`, `protocol/environment.md`, `protocol/fragments.md`, `protocol/inheritance.md`
- Security documentation: `security/threat-model.md`, `security/trust-boundaries.md`, `SECURITY.md`
- Extension design sketches: `extensions/exchange.md` (v2 AirDrop), `extensions/registry.md` (v2/v3), `extensions/hooks.md`, `extensions/compiler-targets.md`, `extensions/extension-points.md`
- Example profiles: `examples/minimal.harness.yaml`, `examples/data-engineer.harness.yaml`, `examples/fragment-mcp-server.harness.yaml`
- Community files: `README.md`, `CONTRIBUTING.md` (with HEP process), `GOVERNANCE.md`, `CODE_OF_CONDUCT.md`, `LICENSE` (Apache 2.0), `MAINTAINERS.md`
