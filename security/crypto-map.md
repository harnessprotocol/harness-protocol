# Crypto Map

The Harness Protocol uses more than one cryptographic primitive, in more than one layer, for more than one purpose. This document maps them so the design reads as **deliberately orthogonal, not redundant**: each primitive answers a different question for a different actor with a different lifecycle. It is a reference, not a new normative requirement — each mechanism is specified in its own document, linked below.

---

## The three questions

| Question | Mechanism | Layer / doc | Actor | Lifecycle |
|----------|-----------|-------------|-------|-----------|
| "Are these the exact bytes that were referenced?" | **SHA-256** content hash (`integrity.sha256`; registry index hash) | Schema / [Integrity](./integrity.md); Registry / [Registry](../protocol/registry.md) | none (keyless) | per-artifact, immutable |
| "Did the holder of this key produce this offer, for me, untampered?" | **ed25519** signature (+ **X25519** payload encryption) | Exchange / [Exchange](../protocol/exchange.md) | a peer (self-sovereign, ephemeral) | per-offer, no registration |
| "Is this published release from the author it claims, over time?" | **minisign** publisher signature | Schema supply-chain / [Integrity](./integrity.md) | a publishing author (durable identity) | per-release, with key rotation |

These are not interchangeable. Forcing one primitive onto all three jobs would couple an ephemeral peer-sharing flow to a durable publication-provenance system, or burden keyless content integrity with key management. Keeping them separate is the point.

---

## Where each lives

### SHA-256 — content integrity (keyless)

Answers "is the content I fetched the content that was referenced?" with no key management. It appears in two places:

- **`integrity.sha256`** on plugins, skills, and stdio MCP server packages — optional in v1 (warn if absent), promotable to mandatory with `policy.require-integrity: true`, and on the roadmap to become required. See [Integrity](./integrity.md).
- **Registry index hashes** — the [Registry](../protocol/registry.md) stores the SHA-256 of every indexed document so a client can verify a GitHub fetch matches what was indexed (`GET /api/v1/verify`).

A SHA-256 hash attests *provenance of bytes*, never *benignity of content*.

### ed25519 / X25519 — Exchange transit identity (v2)

Answers "did the holder of this key produce this offer, untampered, and (when encrypted) for me specifically?" The [Exchange](../protocol/exchange.md) offer envelope is signed with the sender's ed25519 key and optionally encrypted to the recipient with X25519. This identity is **self-sovereign and ephemeral**: no registration, no central authority, no global revocation in v2. It is the right fit for 1:1 peer sharing, and intentionally weaker than a certified-publisher identity. See [Exchange Security](./exchange.md).

### minisign — publisher signing (supply-chain track)

Answers "is this published release from the author it claims to be, across versions and key rotations?" This is the **publisher-signing track specified in [Integrity](./integrity.md)**: plugin/skill authors sign releases with a minisign key, profiles carry the author's public-key fingerprint alongside `integrity.sha256`, key distribution flows through the registry, and the registry's transparency log records the signature per release. That document is the authority for this track's scope and milestone — this map does not re-date it.

A **separate, later application** of minisign is **registry-index signing**: the registry signing its *own* index entries so a client can verify the registry beyond the TLS channel. That is **v3** Registry scope (see [Registry](../protocol/registry.md) and [Registry Security](./registry.md)), distinct from author release signing even though both use minisign.

**One transparency log, enriched over time.** The Registry maintains a single append-only transparency log. In **v2** its entries are hash-based `index`/`delist` events ([Registry](../protocol/registry.md)). When publisher signing ships, each release's minisign signature is added to its entry (the [Integrity](./integrity.md) track). The signed-entry description in [Integrity](./integrity.md) and the v2 entry shape in [`registry.schema.json`](../schema/draft/registry.schema.json) are the **same log at two points in its evolution**, not two competing designs.

---

## How they compose

The mechanisms stack without overlap on a single artifact's journey:

1. A developer shares a fragment 1:1 via **Exchange** — authenticity in transit comes from **ed25519** (and confidentiality from **X25519**).
2. The recipient publishes that fragment to a GitHub repo and registers it with the **Registry** — discoverability plus a **SHA-256** index hash anyone can verify a fetch against.
3. If the published artifact is a signed plugin/skill release, **minisign** publisher signing (per [Integrity](./integrity.md)) attests authorship over time, with the registry distributing keys and logging signatures.
4. In v3, the **registry signs its index** with minisign so clients trust the index itself without trusting only TLS.

Each step adds a guarantee the previous one did not make, and none replaces another. The throughline across all of them: the protocol provides mechanisms to **verify** — who, what, and untampered — and never asks a user to **trust** a content source as inherently safe; that judgment stays at apply time.
