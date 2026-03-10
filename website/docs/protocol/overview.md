---
sidebar_position: 1
---

# Overview

The Harness Protocol defines a YAML document format (`harness.yaml`) and a set of behavioral contracts for tools that read and apply it.

## Design goals

**Completeness** — A single file should capture everything needed to reproduce an AI coding setup: what plugins are installed, what tools are available via MCP, what environment the agent expects, how the agent should behave, and what it's allowed to do.

**Portability** — The format is tool-agnostic. A `harness.yaml` written for Claude Code should be readable by a Copilot integration, a Cursor plugin, or any future tool that adopts the spec.

**Layered adoption** — Tools can adopt the spec incrementally. Schema-layer validation (parsing + validating `harness.yaml`) has zero runtime dependencies. Exchange and Registry layers are optional infrastructure a tool can add later.

**Security by default** — Sensitive environment variables have no defaults by design. The schema enforces this structurally. See [Security](../security/threat-model) for the full threat model.

## Document structure

A `harness.yaml` document has these top-level fields:

| Field | Required | Description |
|-------|----------|-------------|
| `version` | ✓ | Must be the string `"1"` |
| `metadata` | ✓ | Profile identity: name, description, author, tags |
| `plugins` | — | Skills and agents from plugin sources |
| `mcp-servers` | — | Local (stdio) and remote (http) MCP servers |
| `env` | — | Environment variable declarations |
| `instructions` | — | Operational and behavioral guidance injected at apply time |
| `permissions` | — | Declarative capability intent: tools, paths, network |
| `extends` | — | Inherit from a base profile |
| `kind` | — | `profile` (default) or `fragment` |

## Conformance

A conforming implementation must:

1. Validate input `harness.yaml` documents against `harness.schema.json` before processing
2. Reject documents that fail validation with actionable error messages
3. Apply `sensitive: true` semantics — never write sensitive env defaults to disk or emit them in logs
4. Treat `import-mode: merge` as the default for the `instructions` section

See the individual field references for detailed conformance requirements.
