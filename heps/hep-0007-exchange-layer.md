---
title: Exchange layer — peer-to-peer harness fragment sharing
hep: 7
type: Standards Track
status: Review
authors: [siracusa5 <siracusa5>]
sponsor: siracusa5 <siracusa5>
created: 2026-06-05
---

## Motivation

The Schema layer (v1) makes a harness a portable artifact, but it gives that artifact only one way to travel: commit it to a GitHub repository and tell someone the `owner/repo` path. That fits stable, team-maintained fragments. It does not fit the cases that come up constantly in practice:

- Sharing a fragment with a teammate *right now*, before it has a permanent home.
- Receiving a fragment from a colleague and previewing its contents before deciding to use it.
- Trying a fragment someone posted in a forum thread without first standing up a repo.
- Sending a one-shot, personally-configured setup (specific permissions, a custom MCP server) as a direct transfer.

Today every one of these falls back to "paste some YAML into chat and hope the recipient integrates it correctly" — which is exactly the un-portable, un-auditable, un-verifiable workflow the protocol exists to remove, and it carries a real security cost: pasted configuration arrives with no provenance and no tamper-evidence.

This HEP introduces the **Exchange layer**: a push-based, consent-required flow for moving a single fragment from one person to another — "AirDrop for harnesses." It is the v2 milestone's primary deliverable. It adds a **transport envelope and a flow**, not new `harness.yaml` concepts: the unit of exchange is the existing `kind: fragment` document, unchanged.

## Specification

Exchange operates on `kind: fragment` documents wrapped in a signed **offer envelope**, moved through a mandatory-preview flow. The normative prose lives in [protocol/exchange.md](../protocol/exchange.md); the envelope is validated by [`schema/draft/exchange.schema.json`](../schema/draft/exchange.schema.json) (`$id` `https://harnessprotocol.io/schema/v2/exchange.schema.json`). This section states the normative core.

### The offer envelope

An offer is a JSON document. Required: `version` (const `"1"` — the envelope format's own version), `type` (`"offer"`; receivers MUST reject unknown types), `sender.key` (the sender's ed25519 public key, lowercase hex), `expires` (RFC 3339 / ISO 8601 date-time), and `signature`. It carries **exactly one** of `fragment` (a `kind: fragment` document as a JSON object) or `encrypted-fragment` (an X25519 sealed payload, which additionally requires `recipient.key`). Optional: `message`, `sender.display` (UNVERIFIED), `suggested-import-mode` (`merge`/`replace`/`skip`, a non-binding hint).

The envelope schema treats the wrapped fragment as opaque. A conformant implementation MUST perform **two** validations before preview: (1) the envelope validates against `exchange.schema.json`, and (2) the decoded fragment validates against the harness schema with `kind: fragment` semantics.

### Signing and verification

`signature` is a detached ed25519 signature (lowercase hex, 128 chars) produced by the sender's private key. For plaintext envelopes it covers the **canonical-JSON bytes** of `fragment` (object keys sorted, no insignificant whitespace); for encrypted envelopes it covers the raw `encrypted-fragment.ciphertext` bytes. The signature asserts only "I, holder of this key, produced this content" — it deliberately does not cover `message` or `expires`.

Receivers MUST verify the signature before displaying the preview. **Verification failure is a hard rejection** — there is no "proceed anyway" prompt. Receivers MUST NOT apply an offer whose `expires` is in the past.

### Encryption

When the transport is observable (a relay or HTTP) and the recipient's key is known at offer time, the payload MUST be encrypted to the recipient's key using X25519 + XSalsa20-Poly1305 (`algorithm: "x25519-xsalsa20-poly1305"`), replacing `fragment` with `encrypted-fragment`. Encryption is OPTIONAL for local transports (clipboard, file) and direct peer channels. Unaddressed offers (no `recipient`) MUST NOT be encrypted and MUST NOT contain secret material.

### The flow

The flow is fixed and consent-first:

```
Offer → Preview → Accept / Edit / Reject → Apply
```

There is no "push and apply" shortcut — this is a security property, not UX polish. At **Preview** the implementation MUST show the sender key fingerprint (not just `display`), the signature verification status, the full untruncated fragment, every `env` declaration with `sensitive` entries highlighted, and every MCP server command; it MUST NOT apply any part of the fragment before the receiver decides, and MUST NOT truncate content to make it look simpler. **Accept** applies the fragment via the standard v1 `extends`/import-mode machinery. **Edit** re-validates after the receiver's changes and records the result as a user-edited import (not a verbatim acceptance). **Reject** discards the offer; nothing is applied.

On Apply, the receiver writes the fragment into a local exchange store and references it with a standard v1 **local source** (a `./` relative path) — introducing no new `harness.yaml` fields and no new source schemes:

```yaml
extends:
  - source: ./.harness/exchange/postgres-mcp-20260309T143022Z.harness.yaml
    version: "1.0.0"
```

Provenance (sender fingerprint, received-at, edited-or-not) is retained by the implementation in its exchange store, **not** as fields on the `extends` entry — a v1 `extends` item admits only `source` and `version` (`additionalProperties: false`, no `x-` carve-out at that level). Keeping provenance off the harness file is what makes Apply valid against the unchanged v1 schema.

### Resolutions to the open questions

The pre-HEP sketch left six questions open. They are resolved as follows:

1. **Relay trust model.** The spec defines a minimal **relay API** so that anyone can operate a compatible relay; the official relay at `exchange.harnessprotocol.io` is a convenience with a non-normative best-effort SLA. A relay handles only opaque (and, when encrypted, unreadable) bytes; it is never a trust anchor. When a relay is unavailable, clipboard/file transport remains available and requires no infrastructure.
2. **Fingerprint format.** The **canonical** fingerprint is `blake2b:` + the first 16 hex chars of a BLAKE2b-256 hash of the raw key material; the **display** form groups those 16 chars as `a3f1:e2b4:c5d6:e7f8` for visual comparison. Hashing (rather than truncating the raw key) avoids structure-based fingerprint collisions.
3. **Offer receipt.** Deferred. v2 is fire-and-forget; the `type: "receipt"` value is reserved (and rejected by the v2 schema) for a future signed-acknowledgement extension.
4. **Known-keys / addressbook.** The spec defines only the **trust assertion** ("I recognize this fingerprint"). On-disk key management (an SSH-`known_hosts`-style store, a `trust-key` command) is an implementation concern for harness-kit, not normative.
5. **Fragment storage.** Received fragments are written to a local store (`.harness/exchange/`), are **not** auto-committed, and are referenced from `extends` via a standard v1 local (`./`) source; provenance lives in the exchange store, not on the harness file (see above). Promoting a received fragment to a published registry entry is a separate, explicit step (see HEP-8), never automatic.
6. **Team distribution.** Out of scope for Exchange. Exchange is strictly **1:1 push**; one-to-many distribution (publish once, many fetch) is the **Registry's** job ([HEP-8](hep-0008-registry-layer.md)). This boundary keeps the two layers cohesive.

## Rationale

**Why a new layer and not a schema change.** The "composable from primitives" principle says to check existing primitives first. The fragment, `extends`, and import-mode machinery already express *what* is shared and *how it composes*; what is missing is a *transport with provenance and consent*. That is a transport envelope plus a flow, not a new document concept — so the fragment schema is untouched and a fragment authored under v1 is Exchange-compatible unmodified.

**Why consent-first is normative, not advisory.** If an implementation could "push and apply," Exchange would become a remote-configuration channel — precisely the instruction-injection and supply-chain risk the security model exists to contain. Making preview mandatory and signature-verify-before-preview a hard gate is what lets Exchange be safe by default.

**Why ed25519 raw-key identity rather than a registry account or minisign.** Exchange's trust assertion is "I am sending this to *you specifically*, and here is *my* key" — an ephemeral, self-sovereign, no-registration relationship. ed25519 raw keys fit that exactly. Publisher provenance for *published* content is a different assertion with a different lifecycle (rotation, registry key distribution) and is handled by content integrity (SHA-256) plus the minisign publisher-signing track specified in [Integrity](../security/integrity.md), with the registry signing its own index arriving in v3. See the [crypto map](../security/crypto-map.md) for why these are deliberately separate primitives rather than one unified scheme.

**Why the signature covers only the fragment.** `message` and `expires` are envelope metadata, not content; signing them would assert authorship of the message and timestamp, which is not what the receiver needs. The receiver needs "this fragment is exactly what the key-holder produced," which is what signing the canonical fragment (or ciphertext) bytes provides.

**Alternatives considered.** (1) *Exchange profiles, not just fragments.* Rejected: profiles carry local assumptions (paths, personal env, org settings) that make verbatim transfer unsafe; fragments are the composable unit people actually want to share. (2) *WebSocket/WebRTC as the MVP transport.* Rejected as over-engineered for the core use case; clipboard/file is the zero-infrastructure MVP and HTTP pull is the production transport, with WebSocket/WebRTC deferred. (3) *Unify Exchange identity with the minisign publisher-signing roadmap into one crypto HEP.* Rejected: it couples an ephemeral peer-sharing flow to a publication-provenance system, bloats the prototype surface, and would stall both. Keeping them orthogonal and documenting the boundary is cleaner.

## Backward Compatibility

Fully backward compatible with the Schema layer. Exchange adds **no** `harness.yaml` fields: the `version` field stays `"1"` and `harness.schema.json`'s `$id` (`/schema/v1/...`) is unchanged. The offer envelope is a *new* document type with its own schema under the `/schema/v2/` `$id` namespace and its own `version: "1"`. No existing document changes meaning, and an implementation that does not support Exchange is unaffected — it simply does not offer the `harness exchange` flow. The only new normative obligations apply to implementations that *opt in* to Exchange.

## Security Considerations

Exchange's threat surface and mitigations are specified in [security/exchange.md](../security/exchange.md). In summary:

- **Forged or tampered offer** → mandatory signature verification before preview, hard-fail on mismatch.
- **Instruction/skill injection via a shared fragment** → mandatory consent-first preview; an applied fragment is then subject to the *same* trust constraints as any other `extends` entry (it is not privileged by having arrived through Exchange).
- **Replay of an intercepted offer** → `expires` bounds the validity window; receivers reject expired offers.
- **Relay observation of contents** → X25519 payload encryption is required for observable transports; the relay sees only opaque bytes.
- **Identity spoofing** → only the key fingerprint is authenticated; `display` is explicitly UNVERIFIED. v2 has no protocol-level key revocation (a compromised key is rotated and re-communicated out-of-band) — a documented limitation that v3 registry key-rotation addresses.

The relationship between Exchange's ed25519 transit identity and the Registry/plugin minisign provenance track is documented in [security/crypto-map.md](../security/crypto-map.md) so the two are understood as orthogonal, not redundant.

## Prototype

Per the Standards Track prototype requirement, this HEP's **format prototype is satisfied in-repo**:

- The envelope schema: [`schema/draft/exchange.schema.json`](../schema/draft/exchange.schema.json).
- Validating examples: [`examples/exchange/postgres-offer.json`](../examples/exchange/postgres-offer.json) (plaintext) and [`postgres-offer.encrypted.json`](../examples/exchange/postgres-offer.encrypted.json) (encrypted).
- Eval coverage: `eval/src/tests/schema/exchange.test.ts` — valid/invalid envelopes, the `oneOf` exclusivity, and the two-step "envelope valid but wrapped fragment invalid" check.

The **runtime prototype** — the `harness exchange offer/accept` subcommands, ed25519 signing/verification, X25519 encryption, the relay API, and the consent-first preview UI — is a behavior of the reference implementation and is required in [harness-kit](https://github.com/harnessprotocol/harness-kit) before this HEP moves to **Accepted**. As with HEP-6, the in-repo artifacts verify the *declaration surface*; the prose specifies the apply-time semantics a conformant implementation MUST enforce.
