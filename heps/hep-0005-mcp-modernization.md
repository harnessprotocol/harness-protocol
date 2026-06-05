---
title: MCP transport modernization and server provenance
hep: 5
type: Standards Track
status: Accepted
authors: [siracusa5 <siracusa5>]
sponsor: siracusa5 <siracusa5>
created: 2026-06-03
---

## Motivation

The `mcp-servers` section was specified against an earlier state of the Model Context Protocol. Two things have since changed enough to matter for a portable declaration:

1. **The remote transport landscape settled.** The streamable HTTP transport is now the canonical remote transport for MCP; the older Server-Sent Events (SSE) transport is deprecated upstream and retained only for compatibility. The Harness Protocol's `transport` enum spells the canonical transport as `http` and lists `sse` as a peer rather than a legacy fallback. It also lists `ws` (WebSocket), which is not a standard MCP transport. A harness author reading the enum cannot tell which value is current, which is legacy, and which is non-standard.

2. **Server provenance became expressible and important.** MCP servers are now published with stable identities (reverse-DNS names) and versions through a public registry, and discoverable metadata is served from well-known locations. At the same time, supply-chain incidents across agent capability artifacts have made provenance and integrity a first-order concern. The current `mcp-servers` declaration has no place to record where a server came from or to verify it — and [MCP Declarations](../protocol/mcp-declarations.md) explicitly notes that the plugin `integrity` field does *not* cover MCP server packages. There is an acknowledged gap and no field to close it.

This HEP modernizes the transport enum and adds optional provenance/integrity fields, without breaking any existing declaration.

## Specification

### Transport enum

Add `streamable-http` to the remote-transport enum. The remote enum becomes:

```
["streamable-http", "http", "sse", "ws"]
```

Normative meaning:

- **`streamable-http`** — the canonical remote transport. RECOMMENDED for all remote servers.
- **`http`** — an accepted alias for `streamable-http`, retained because it is already in use. Implementations MUST treat `http` and `streamable-http` identically.
- **`sse`** — the legacy Server-Sent Events transport. Deprecated. Retained for compatibility with older servers. New servers SHOULD NOT use it. Implementations MAY warn when `sse` is declared.
- **`ws`** — non-standard and implementation-specific. Retained for forward compatibility but not part of the recommended set. Implementations that do not support it SHOULD treat an unrecognized transport as unsupported (per the enum-additions guarantee) rather than failing the document.

Recommended set going forward: **`stdio`**, **`streamable-http`** (with `http` as its alias), and `sse` for legacy interop.

### Server provenance and integrity (optional)

Add optional fields to MCP server declarations:

- `source` (both transports) — a provenance identifier: a registry identity in reverse-DNS form (e.g., `io.github.owner/server`) or `owner/repo`. Records where the server originates, for auditability. It does not change how a `stdio` server's `command` is invoked or how a remote `url` is contacted.
- `version` (both transports) — a version or semver range identifying the server build, complementing any version pinned in `stdio` `args`.
- `integrity.sha256` (`stdio` only) — lowercase hex SHA-256 of the server package archive, where verifiable. Implementations SHOULD verify when present and WARN when absent for externally-sourced servers. `integrity` is omitted from remote transports, where there is no fetched archive to hash; remote servers rely on TLS and registry/identity verification instead.

```yaml
mcp-servers:
  search:
    transport: streamable-http
    url: "https://search.example.com/mcp"
    source: "io.github.example/search"
    version: ">=2.0.0"
    headers:
      Authorization: "Bearer ${SEARCH_API_KEY}"
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres, --connection-string, "${DB_CONNECTION_STRING}"]
    source: "io.github.example/postgres"
    version: "1.4.2"
    integrity:
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

### Authorization (prose only, no schema field)

Remote authorization for MCP servers is a runtime concern handled by the OAuth 2.1 flow with resource indicators that binds a token to a specific server. The Harness Protocol does not model that handshake. Tokens continue to be supplied declaratively through `headers` values referencing `sensitive` `env` entries. [MCP Declarations](../protocol/mcp-declarations.md) is updated to describe the OAuth resource-indicator model as the runtime mechanism and to point to registry/well-known discovery as the resolution target for `source`.

JSON Schema diff (additive, in `schema/draft/harness.schema.json`): the remote-transport enum gains `streamable-http`; `source` and `version` are added to both transport variants; `integrity` is added to the `stdio` variant. No existing field is removed or made required.

## Rationale

**Why keep `http` as an alias rather than rename.** Existing harnesses use `transport: http`. Renaming would break them. Adding `streamable-http` as the canonical spelling and defining `http` as its alias gives authors a clear "current" value while preserving every existing document. This matches the additive-enum backward-compatibility guarantee.

**Why retain `sse` and `ws` rather than remove.** Removing an enum value is a breaking change under the stability commitment. `sse` still has real legacy servers; `ws` may be in use by some implementation. Deprecating in prose and documenting their status communicates direction without invalidating documents — the conservative choice the "stability over velocity" principle requires.

**Why provenance fields are optional and declarative.** Consistent with `permissions` being "defense-in-depth documentation, not the enforcement boundary," `source`/`version`/`integrity` declare intent and enable verification but do not themselves enforce. This keeps the protocol declarative (the runtime decides how to act on a hash mismatch) while making provenance auditable — satisfying "declared over implicit."

**Why no auth schema field.** The OAuth resource-indicator handshake is a runtime negotiation between client and authorization server; encoding it in a static portable document would either duplicate runtime state or lock the document to one auth topology. Header + `sensitive` env already carries the only thing a portable document needs (the token reference). Modeling the full flow fails the "declarative over imperative" test.

**Alternatives considered.** (1) *Drop `http`, make `streamable-http` the only canonical value.* Rejected: breaks existing documents. (2) *Add a structured `auth` object.* Rejected: runtime concern, fails declarative test, premature given the upstream flow is still stabilizing. (3) *Require `integrity` for all servers.* Rejected here; made available to [HEP-0006](hep-0006-governance-layer.md)'s `policy.require-integrity` instead, so orgs can opt in rather than imposing it globally.

## Backward Compatibility

Backward compatible. Adding `streamable-http` to an enum is an additive enum change covered by the enum-additions guarantee in [Extension Points](../extensions/extension-points.md). `source`, `version`, and `integrity` are new optional fields. Every existing `mcp-servers` declaration — including those using `transport: http`, `sse`, or `ws` — remains valid and behaves identically. The `version` field in `harness.yaml` remains `"1"`. The schema `$id` is unchanged.

## Security Considerations

This change strengthens the security model. `source` makes server provenance auditable; `integrity.sha256` enables detection of `stdio` package tampering, closing the gap explicitly called out in [MCP Declarations](../protocol/mcp-declarations.md) and [Integrity](../security/integrity.md). The existing SSRF and HTTPS-enforcement requirements for remote transports are unchanged and apply to `streamable-http` exactly as they applied to `http`.

Deprecating `sse` in prose nudges authors toward the transport with the more current security posture without forcing a migration. The authorization note clarifies that token handling continues to flow through `sensitive` env, preserving the rule that implementations MUST NOT log resolved sensitive header values.

`mcp-servers` participates in the [HEP-0006](hep-0006-governance-layer.md) policy ceiling via `policy.mcp-servers.allowed-sources` / `denied-sources` and `policy.require-integrity`.

## Prototype

Satisfied in-repo:

- JSON Schema additions in `schema/draft/harness.schema.json` (enum value + provenance fields).
- Validating example in `examples/fragment-mcp-server.harness.yaml` (a `streamable-http` server with `source` and `integrity`).
- Eval test suite coverage in `eval/src/tests/schema/` (valid `streamable-http` + provenance; invalid integrity pattern; `integrity` rejected on remote transport).
