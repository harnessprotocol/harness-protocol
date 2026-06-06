---
title: Registry layer — hosted discovery for harnesses
hep: 8
type: Standards Track
status: Review
authors: [siracusa5 <siracusa5>]
sponsor: siracusa5 <siracusa5>
created: 2026-06-05
---

## Motivation

The Schema layer makes a harness addressable by `owner/repo`, which is enough to *fetch* a fragment you already know about. It does nothing for *discovery*. There is no way to ask "what fragments exist for data-engineering workflows?", "which postgres MCP fragment is most widely used?", or "what versions of this profile have been published, and what did each hash to?" Today the answer is "search GitHub by hand," which does not surface harness documents specifically, carries no integrity guarantee, and gives no provenance timeline.

This HEP introduces the **Registry layer**: a hosted index at harnessprotocol.io that makes published harnesses discoverable, hashable, and auditable — while keeping GitHub authoritative. It pairs with [Exchange](hep-0007-exchange-layer.md): Exchange handles 1:1 push with no infrastructure; the Registry handles 1:many pull. Together they are the v2 milestone.

## Specification

The normative prose lives in [protocol/registry.md](../protocol/registry.md). The concrete JSON document shapes the registry produces and consumes are validated by [`schema/draft/registry.schema.json`](../schema/draft/registry.schema.json) (`$id` `https://harnessprotocol.io/schema/v2/registry.schema.json`); the HTTP discovery API is specified in prose because it is request/response traffic, not a stored document. This section states the normative core.

### What is indexed

The registry indexes three existing v1 content types — `kind: profile` documents, `kind: fragment` documents, and `plugin.json` manifests — and **adds no `harness.yaml` fields**. For each indexed version it stores location (`owner`/`repo`/`ref`/`path`), the SHA-256 content hash, extracted metadata, an index timestamp, validation status, and the declared schema version. It stores the hash and location, **not** the document content: clients fetch from GitHub and verify against the hash.

### Registration

`POST /api/v1/register` with a `registrationRequest` body (`repo` required; `ref` defaults to the default branch; `path` defaults to `harness.yaml`). The registry fetches, validates against the v1 schema, computes the SHA-256, extracts metadata, and returns a `registrationResponse`. Registration is **not** an approval gate — any valid harness in a public repo can be registered. Authors are encouraged to register tags, not branches; the registry MAY auto-index new semver tags, with per-`owner/repo` opt-out.

### Discovery

`GET /api/v1/{profiles,fragments,plugins}` with `q`/`tags`/`author`/`license`/`limit`/`offset`; per-entry metadata and version-list endpoints; and `GET /api/v1/verify?repo=&ref=` returning the stored SHA-256 for client-side comparison. Results are filterable by declared schema version so a v1-only client can exclude newer documents.

### Transparency log

The registry maintains an **append-only** transparency log, published as NDJSON at `/transparency-log`. Each line is a `transparencyLogEntry` — an `index` event (`seq`, `timestamp`, `id`, `sha256`, `kind`, `schema-version`) or a `delist` event (`seq`, `timestamp`, `id`, `reason`, optional `detail`). `seq` is gap-free and strictly increasing. Delistings are recorded with a reason and never silently removed, so the registry cannot drop content without a public record.

### Trust model and content policy

The registry is **not a trust anchor**. The trust chain is: user trusts the GitHub source → registry provides the hash → implementation verifies the fetch → user reviews and confirms before applying. The hash guarantees "this is what was indexed," not "this is safe." The registry can **delist** (remove from search) but cannot **alter** GitHub content. Delisting grounds in v2 are narrow and enumerated (schema invalidity, manifest malicious intent, author request, legal requirement); opinionated content, broad permissions, and aggressive instructions are explicitly **not** grounds.

### v2 / v3 boundary

v2 delivers indexing, search, SHA-256 integrity, the transparency log, a browse UI, and no approval gate. v3 adds verified-author badges, curated collections, **minisign-based registry signing**, semantic search, metrics, and a compatibility matrix. The boundary keeps v2 shippable; curation and cryptographic publisher trust arrive in v3 when there is enough content to make them meaningful.

## Rationale

**Why an index, not a host.** The "stability" and "no lock-in" goals require that the registry never become a single point of failure for *access*. Indexing GitHub-hosted content (rather than hosting it) means a registry outage costs discoverability, not availability — every entry remains fetchable at its GitHub URL. It also means the registry inherits GitHub's namespace and identity rather than minting its own, which avoids name-squatting before a registry even exists.

**Why index hashes but not registry signing in v2.** SHA-256 integrity answers a concrete question — "is the content I fetched the content that was indexed?" — with zero key-management burden. Having the *registry sign its own index entries* (so clients trust the registry beyond TLS) answers a different question and adds a key-management and rotation story for the registry itself; bundling it into v2 would gate the entire registry on that machinery, so it is deferred to v3. (Author publisher signing of plugin/skill releases is a separate supply-chain track owned by [Integrity](../security/integrity.md), not this HEP.) See the [crypto map](../security/crypto-map.md) for how SHA-256 integrity, Exchange's ed25519 identity, and minisign signing compose without overlap.

**Why a transparency log.** A registry that can silently delist is a censorship and tamper risk. An append-only, publicly streamed log makes both index *and* delist events auditable: an index entry missing from the log signals tampering, and a delisting always carries a logged reason. This is the minimum mechanism that lets users trust the index without trusting the operator's discretion.

**Why no approval gate.** An approval gate would make the registry a curator and an arbiter of "good" harnesses — a role the "openness" goal rejects and that does not scale. The content policy is therefore narrow and reactive (delist demonstrable harm), not a publication filter.

**Alternatives considered.** (1) *Host content in the registry.* Rejected: creates lock-in and an availability SPOF, and duplicates GitHub. (2) *Registry-assigned IDs / namespaces.* Rejected: invites squatting and diverges from the `owner/repo` address that already works in `extends`. (3) *Ship verified authors and signing in v2.* Rejected: gates discovery on key infrastructure; deferred to v3 behind the documented boundary.

## Backward Compatibility

Fully backward compatible. The Registry adds **no** `harness.yaml` fields; `version: "1"` and the harness schema `$id` are unchanged. The registry's own document shapes live in a new schema under the `/schema/v2/` `$id` namespace. The Registry indexes documents that are already valid under the Schema layer; an implementation that ignores the Registry is unaffected, and `owner/repo` resolution continues to work with or without a registry.

## Security Considerations

The Registry threat model is specified in [security/registry.md](../security/registry.md). In summary:

- **Index poisoning / typosquatting** → the registry inherits GitHub's namespace (no registry-minted IDs), displays the verifiable GitHub `owner`, and never certifies safety; users verify the source.
- **Content altered after indexing** (force-push, tag replacement) → detectable via the `verify` endpoint and the transparency log's recorded hash; clients compare the GitHub content's hash against the indexed hash.
- **Silent delisting / censorship** → delistings are append-only log events with enumerated reasons; the registry cannot remove content without a public record, and appeals follow GOVERNANCE.md.
- **"Valid hash ⇒ safe" confusion** → explicitly rejected in the trust model; integrity attests provenance of bytes, not benignity of content. The registry is a discovery convenience, not a trust anchor.

The Registry strengthens supply-chain auditability (hashes + first-seen timestamps + transparency log) without claiming to certify content. Registry-index signing (the registry signing its own entries) is deferred to v3; author publisher signing is the separate supply-chain track in [Integrity](../security/integrity.md). The [crypto map](../security/crypto-map.md) records how SHA-256 integrity, Exchange's ed25519 identity, and minisign signing compose.

## Prototype

Per the Standards Track prototype requirement, the **format prototype is satisfied in-repo**:

- The document schema: [`schema/draft/registry.schema.json`](../schema/draft/registry.schema.json) (transparency-log entries, registration request/response).
- Validating examples: [`examples/registry/register-request.json`](../examples/registry/register-request.json), [`register-response.json`](../examples/registry/register-response.json), and [`transparency-log.ndjson`](../examples/registry/transparency-log.ndjson).
- Eval coverage: `eval/src/tests/schema/registry.test.ts` — index/delist events, registration shapes, the `oneOf` shape discrimination, and the enumerated delist reasons.

The **service prototype** — the hosted index, the registration and discovery APIs, the auto-indexer, and the transparency-log server — is a runtime system that lives outside this spec repository (a registry service, analogous to harness-kit for the Schema layer). A working service prototype is required before this HEP moves to **Accepted**. As with HEP-6 and HEP-7, the in-repo artifacts verify the *document surface*; the prose specifies the API and trust semantics a conformant registry MUST implement.
