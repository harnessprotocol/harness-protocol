# Terminology

This document defines terms used throughout the Harness Protocol specification. Where a term has a specific technical meaning in this spec, that meaning takes precedence over general usage. The three foundational terms are **Harness**, **Profile**, and **Fragment** — start there if you are new to the spec.

---

## Harness

The complete operational context for an AI coding agent: its plugins, MCP server declarations, environment variable requirements, behavioral instructions, permission boundaries, and any inherited configuration from parent harnesses. A harness is described by a `harness.yaml` file conforming to the Harness Protocol Schema.

A harness is not a tool, not a plugin, and not a model. It is the environment in which an agent operates — analogous to a shell environment for a Unix process, but for an AI coding session.

---

## Profile

A `harness.yaml` document with `kind: profile` (or no `kind` field, since `profile` is the default). A profile is a **complete harness document** that passes required-field validation. It is suitable for direct application by a conformant implementation.

Profiles are the primary artifact of the Harness Protocol. When someone shares a harness configuration, they are sharing a profile.

---

## Fragment

A `harness.yaml` document with `kind: fragment`. A fragment is a **partial harness document** that intentionally omits fields that would be required in a profile. Fragments are building blocks — they define a partial set of plugins, instructions, or permissions that other harnesses can incorporate. Required-field validation is skipped for fragments.

Fragments are the primary composition mechanism for the v2 Exchange layer. In v1, they can be used locally via `extends`.

---

## Plugin

A packaged extension that adds capabilities to an AI coding agent. A plugin may provide skills (prompt templates invocable as slash commands), agents (specialized sub-agent definitions), MCP server configurations, or combinations thereof.

In `harness.yaml`, plugins are declared in the `plugins[]` array. Each entry references a plugin by `source` (owner/repo) and `version`. The plugin itself declares its capabilities in a `plugin.json` manifest. See [Plugin Manifest](./plugin-manifest.md).

---

## Skill

A prompt template that a plugin makes available as a slash command. Skills are invoked by the user at runtime (e.g., `/research "query"`). They are declared in a plugin's `plugin.json` manifest under `skills[]` and implemented as files within the plugin's repository.

Skills are distinct from agents: a skill is a single prompt invocation; an agent is a persistent sub-agent with its own configuration and scope.

---

## Agent

A specialized sub-agent definition provided by a plugin. An agent has its own system prompt, tool permissions, and operational scope. Unlike skills, agents can be long-running and may maintain session state within a task boundary. Agents are declared in a plugin's `plugin.json` manifest under `agents[]`.

---

## MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server declaration within a harness. MCP servers expose tools, resources, and prompts to the AI agent at runtime. In `harness.yaml`, MCP servers are declared in the `mcp-servers` map, keyed by name.

An MCP server declaration is not the server itself — it is configuration that tells the harness implementation how to start or connect to the server (transport, command, args, env). The harness implementation is responsible for lifecycle management.

---

## Import Mode

The strategy governing how a child harness's `instructions` fields combine with inherited instructions from a parent harness (via `extends`). The `instructions.import-mode` field accepts three values:

| Mode | Behavior |
|------|---------|
| `merge` | Child instructions are appended after parent instructions. Both apply. This is the default. |
| `replace` | Child instructions entirely replace the parent's instructions for the affected fields. Parent instructions are discarded. Requires explicit user confirmation before application. |
| `skip` | Child does not define instructions. Parent instructions pass through unmodified. |

Import mode applies to the `instructions` section only, not to plugins, permissions, or other sections.

---

## Source

The canonical reference for a plugin's origin, using `owner/repo` format (e.g., `harnessprotocol/harness-kit`). The `source` field in a `plugins[]` entry replaces the legacy `marketplace` indirection by pointing directly to the repository where the plugin lives.

A conformant implementation resolves a plugin source by fetching the `plugin.json` manifest from the specified repository at the specified version. The protocol does not mandate a specific hosting provider; GitHub is conventional but not required.

---

## Integrity

A content-verification checksum for a plugin, declared in `plugins[].integrity.sha256`. The SHA-256 hash must match the content of the resolved plugin archive before the plugin is applied. If verification fails, the implementation must refuse to load the plugin and surface an error.

Integrity fields are optional in v1 but strongly recommended for any harness used in a production or shared context. The v2 Registry layer will enforce integrity for all registry-hosted plugins.

---

## Semver Range

A version constraint string using [Semantic Versioning](https://semver.org) range syntax (following the npm/Cargo convention):

| Expression | Meaning |
|------------|---------|
| `"1.2.3"` | Exactly version 1.2.3 |
| `">=0.2.0"` | 0.2.0 or later |
| `"^1.0.0"` | Compatible with 1.x.x (>=1.0.0 <2.0.0) |
| `"~1.2.0"` | Patch-compatible with 1.2.x (>=1.2.0 <1.3.0) |
| `">=1.0.0 <2.0.0"` | Explicit range |

Semver ranges appear in `plugins[].version` and `extends[].version`.

---

## x- Prefix

Fields in `harness.yaml` whose keys begin with `x-` are **implementation extension fields**. They are reserved for implementation-specific or tool-specific configuration that is outside the core protocol. Conformant implementations must not reject a harness document solely because it contains `x-` fields they do not recognize — they must ignore unknown `x-` fields.

Extension fields must not redefine or shadow any field defined in the core schema. They are not portable across implementations unless both implementations explicitly support the same extension.

Example: `x-claude-model: claude-opus-4` is a valid extension field that a Claude Code-specific implementation might consume, while other implementations ignore it.

---

## HEP

**Harness Enhancement Proposal.** The process for proposing changes to the Harness Protocol specification. An HEP is a structured document describing a proposed change, its motivation, design, backward compatibility impact, and security considerations. The HEP process gates all changes to the core schema and protocol layers.

HEPs are authored against the `harnessprotocol` GitHub organization and follow a numbered sequence (HEP-1, HEP-2, ...). A change is not part of the specification until the corresponding HEP is accepted and merged.

The HEP process does not govern implementation-specific behavior, `x-` extension fields, or blog/example content.
