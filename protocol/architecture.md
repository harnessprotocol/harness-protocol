# Architecture

## System Overview

The Harness Protocol is a layered specification. Each layer has a distinct scope and set of participants. The diagram below shows the full three-layer stack and how components interact.

```
┌─────────────────────────────────────────────────────────────┐
│                    REGISTRY LAYER (v3)                       │
│                                                             │
│  harnessprotocol.ai  ─── search, publish, resolve, verify   │
│       ↑ ↓                                                   │
│  Hosted profile/fragment index with integrity verification  │
└───────────────────┬─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                   EXCHANGE LAYER (v2)                        │
│                                                             │
│  harness push / harness pull  ───  team overlay merging     │
│       ↑ ↓                                                   │
│  Peer-to-peer harness sharing, fragment composition         │
└───────────────────┬─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                   SCHEMA LAYER (v1)                          │
│                                                             │
│  harness.yaml  ──→  JSON Schema validation  ──→  Applied    │
│       │                    │                      by impl.  │
│   plugin.json         harness.schema.json                   │
│  (per plugin)       (canonical source of truth)             │
└─────────────────────────────────────────────────────────────┘
```

In v1, only the Schema layer exists. The Exchange and Registry layers are forward-looking; their design is informed by the schema decisions made now (particularly `kind: fragment` and the `extends` field).

---

## Schema Layer: How It Works

The Schema layer defines how a `harness.yaml` is structured, validated, and applied. The flow has three steps:

### 1. Parse

A conformant implementation reads `harness.yaml` from the project root (or a path configured by the user). The file is parsed as YAML. Parsing errors are fatal — a malformed YAML file must not be partially applied.

### 2. Validate

The parsed document is validated against the JSON Schema at:

```
https://harnessprotocol.ai/schema/v1/harness.schema.json
```

Implementations may cache this schema locally for offline use, but must verify the cached copy against the canonical URL before use in production contexts. Validation failures must surface descriptive errors that identify the failing field and constraint, not just a generic "invalid harness" message.

For `kind: profile` documents (the default), required fields are enforced. For `kind: fragment` documents, required-field constraints are relaxed — only structural constraints (type correctness, enum membership, field co-constraints) apply.

### 3. Apply

A validated harness document is applied by the implementation. Application order:

1. Resolve `extends` — fetch and validate parent harnesses, then merge fields according to section-specific inheritance rules (see [Profile Schema: extends](./profile-schema.md#extends)).
2. Resolve plugins — fetch plugin archives from `source` at the declared `version`, verify `integrity.sha256` if present, load plugin contents.
3. Start MCP servers — launch or connect to declared `mcp-servers` entries using the specified transport.
4. Apply environment — validate that all `required: true` env entries have values in the current environment. Surface missing-variable errors before proceeding.
5. Apply instructions — merge or replace instructions per `import-mode`.
6. Enforce permissions — install permission rules at the tool boundary for the session.

If any step fails, the implementation must not apply a partial harness. Either the full harness applies or none of it does.

---

## The JSON Schema as Source of Truth

The JSON Schema at `harness.schema.json` is the **authoritative definition** of valid `harness.yaml` structure. This prose documentation is normative description on top of it — but when the two conflict, the JSON Schema governs for structural questions, and this documentation governs for semantic questions (e.g., what `import-mode: replace` means at runtime, not just that it is a valid enum value).

This design was chosen deliberately over a TypeScript-intermediary approach (where a type definition file would be the canonical form). Reasons:

- **Language-neutral.** Any implementation in any language can validate against JSON Schema without depending on a TypeScript toolchain.
- **Machine-verifiable.** Conformance tests can be expressed as JSON Schema test cases — valid and invalid documents — without implementation-specific test runners.
- **Stable.** JSON Schema evolves slowly and through a standardized process. TypeScript type systems change with compiler versions.

Implementations that generate typed data structures (e.g., Go structs, TypeScript interfaces, Pydantic models) from `harness.yaml` must treat the JSON Schema as the upstream source, not the other way around.

---

## harness-kit as the Reference Implementation

[harness-kit](https://github.com/harnessprotocol/harness-kit) is the reference implementation of the Harness Protocol. Its role in the ecosystem is analogous to Claude Desktop's role in the MCP ecosystem: it exercises the full spec, serves as a conformance reference, and is the first implementation that users interact with directly.

The reference implementation has two obligations beyond a typical implementation:

1. **Conformance coverage.** harness-kit's test suite must exercise every normative requirement in this specification. When the spec says "implementations must X", harness-kit must have a test asserting it does X.
2. **No spec-privileged behavior.** harness-kit must not implement behavior that is only possible because it is the reference implementation. Any behavior it supports must be expressible through the public `harness.yaml` format and available to any conformant implementation.

harness-kit is not the only conformant implementation. The Harness Protocol is designed for competing implementations.

---

## Exchange and Registry: Forward-Looking Design

### Exchange Layer (v2)

The Exchange layer will define how harnesses are published to and fetched from peers and teams. The primary mechanism is fragment-based composition: a team publishes a fragment (a partial harness with shared plugins, MCP server configs, or permissions), and individual developers extend it in their own profiles.

The `kind: fragment` field and the `extends` syntax in v1 are designed with this in mind. A v1 fragment already has the structure needed for v2 exchange — v2 adds the transport (push/pull protocol) and tooling, not new schema concepts.

Team overlay semantics (explicit add/remove/override operations for unambiguous composition) will be specified as part of the Exchange layer HEP.

### Registry Layer (v2/v3)

The Registry layer will define a hosted index at `harnessprotocol.ai` for discovering, publishing, and resolving versioned profiles and fragments. The registry will enforce integrity verification for all hosted content and provide semantic search across published harnesses.

The `source: owner/repo` field in v1 is deliberately simple — it does not assume the registry exists. When the registry ships, it will provide an alternative resolution path (e.g., `source: harnessprotocol/profiles/backend`), but `owner/repo` resolution will remain valid.

---

## Trust Model Overview

The Schema layer defines the following trust boundaries:

**Plugin sources.** Plugins are fetched from the declared `source` repository at the declared `version`. Implementations must verify `integrity.sha256` when present. Plugins from unverified sources should prompt the user before loading.

**Environment variables.** Variables marked `sensitive: true` must never be logged, stored in non-volatile memory, or included in error messages. The `default` field is forbidden for sensitive variables — defaults for sensitive values must come from the user's environment.

**Permissions.** The permission system follows least-privilege defaults. The `allow` list for tools is intersected across the inheritance chain (most restrictive wins); the `deny` list is unioned (any ancestor's denial propagates). An implementation must not grant permissions that are not explicitly allowed.

**Instructions.** The `import-mode: replace` operation discards parent instructions. Because this is a security-relevant action (a child harness could replace safety instructions), conformant implementations must require explicit user confirmation before applying a profile with `import-mode: replace`.

For the full security specification, see [Security](../security/).
