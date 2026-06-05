# Exchange

This document specifies the **Exchange layer** of the Harness Protocol: a push-based, consent-required flow for sharing a single `kind: fragment` document from one person to another. Exchange is introduced in the v2 milestone and is specified normatively by [HEP-7](../heps/hep-0007-exchange-layer.md). The offer envelope is validated by [`schema/draft/exchange.schema.json`](../schema/draft/exchange.schema.json).

> **Status:** Draft (v2). The format is specified here; runtime behavior is implemented in the reference implementation. Normative language ("MUST", "SHOULD", etc.) follows [BCP 14](https://www.rfc-editor.org/info/bcp14), as in the rest of the specification.

---

## What Exchange Is

Exchange is the "AirDrop for harnesses": a way for two people to move a fragment between them without a registry, a GitHub account on both ends, or a persistent server. It adds a **transport envelope and a flow** on top of the v1 fragment format — not new `harness.yaml` concepts. A fragment authored under v1 is Exchange-compatible without modification.

Three properties define it:

- **Fragments are the unit of exchange.** Exchange operates on `kind: fragment` documents, never on complete profiles. A profile carries local assumptions (file paths, personal env, org settings) that make verbatim peer transfer unsafe; a fragment is the composable piece people actually want to share. See [Fragments](./fragments.md).
- **The flow is consent-first.** A sender cannot cause a fragment to be applied without the receiver previewing it. There is no "push and apply" shortcut. This is a security property.
- **Identity is self-sovereign.** A participant's identity is an ed25519 public key, not an account on a central server. The trust assertion is "I recognize this key fingerprint," not "this key is certified to belong to Alice."

Exchange is strictly **one-to-one (push)**. One-to-many distribution — publish once, many fetch — is the [Registry](./registry.md) layer's responsibility, not Exchange's.

---

## The Offer Envelope

An offer is a JSON document that wraps a fragment with provenance metadata and a signature. It MUST validate against `exchange.schema.json`.

```json
{
  "$schema": "https://harnessprotocol.io/schema/v2/exchange.schema.json",
  "version": "1",
  "type": "offer",
  "sender": {
    "key": "a3f1e2b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    "display": "alice"
  },
  "message": "Here's the postgres MCP config I mentioned — adjust DB_CONNECTION_STRING for your replica.",
  "fragment": {
    "version": "1",
    "kind": "fragment",
    "metadata": { "name": "postgres-mcp", "description": "PostgreSQL MCP server via uvx mcp-server-postgres" },
    "mcp-servers": {
      "postgres": {
        "transport": "stdio",
        "command": "uvx",
        "args": ["mcp-server-postgres", "--connection-string", "${DB_CONNECTION_STRING}"]
      }
    },
    "env": [
      { "name": "DB_CONNECTION_STRING", "description": "PostgreSQL connection string", "required": true, "sensitive": true }
    ],
    "instructions": { "import-mode": "skip" }
  },
  "suggested-import-mode": "merge",
  "expires": "2026-07-01T00:00:00Z",
  "signature": "a3f1…e1f2…"
}
```

### Field reference

| Field | Required | Meaning |
|-------|----------|---------|
| `version` | yes | Envelope format version. MUST be the string `"1"`. This is the Exchange layer's own version — independent of the `harness.yaml` `version` field and of the "v2" milestone label. Receivers MUST reject unrecognized versions. |
| `type` | yes | MUST be `"offer"`. Receivers MUST reject unknown types. `"receipt"` is reserved for a future version. |
| `sender.key` | yes | The sender's ed25519 public key, lowercase hex (64 chars). The only authenticated identity. |
| `sender.display` | no | An UNVERIFIED display name. A hint only; receivers MUST NOT treat it as authenticated. |
| `message` | no | Human-readable note shown at preview. Not covered by the signature. |
| `fragment` | one-of | The `kind: fragment` document, as a JSON object. Mutually exclusive with `encrypted-fragment`. |
| `encrypted-fragment` | one-of | The X25519-sealed payload (`algorithm`, `nonce`, `ciphertext`). Requires `recipient`. Mutually exclusive with `fragment`. |
| `recipient.key` | with encryption | The recipient's ed25519 public key. REQUIRED for encrypted envelopes; absent for unaddressed plaintext offers. |
| `suggested-import-mode` | no | A non-binding hint (`merge`/`replace`/`skip`). The receiver sets the actual mode and MAY override it at Accept. |
| `expires` | yes | ISO 8601 date-time after which the offer is stale. Receivers MUST NOT apply an expired offer. |
| `signature` | yes | Detached ed25519 signature, lowercase hex (128 chars). See below. |

An envelope MUST carry exactly one of `fragment` or `encrypted-fragment`. The wrapped fragment is **opaque to the envelope schema**: a conformant implementation MUST also validate the (decoded) fragment against the harness schema with `kind: fragment` semantics before preview.

### Signing and verification

The `signature` is a detached ed25519 signature produced by the sender's private key. For a **plaintext** envelope it covers the *canonical-JSON bytes* of `fragment` (object keys sorted, no insignificant whitespace). For an **encrypted** envelope it covers the raw `encrypted-fragment.ciphertext` bytes. The signature asserts only "I, holder of this key, produced this content"; it deliberately does not cover `message` or `expires`.

Receivers MUST verify the signature **before** displaying the preview. Verification failure is a hard rejection — there is no "proceed anyway" path. *Non-normative error:*

```
Exchange error: signature verification failed.
This offer may have been tampered with in transit. Do not apply it.
Sender key: a3f1:e2b4:c5d6:e7f8
```

### Encryption

For transports where the envelope crosses an observable channel (relay, HTTP) and the recipient's key is known at offer time, the payload MUST be encrypted to the recipient's key using X25519 key agreement with XSalsa20-Poly1305 (`algorithm: "x25519-xsalsa20-poly1305"`), carried in `encrypted-fragment` with a base64 `nonce` and `ciphertext`. Encryption is OPTIONAL for local transports (clipboard, file) and direct peer channels. **Unaddressed offers MUST NOT be encrypted and MUST NOT contain secret material.**

---

## The Exchange Flow

The flow is fixed:

```
Offer → Preview → Accept / Edit / Reject → Apply
```

### Preview (mandatory)

Before any decision, the receiver's implementation MUST display:

- The sender **key fingerprint** (not just `display`).
- The **signature verification status**.
- The **full, untruncated** fragment content.
- Every `env` declaration, with `sensitive` entries highlighted.
- Every MCP server command.

The preview MUST NOT apply any part of the fragment before the receiver decides, and MUST NOT hide or truncate content to make a fragment look simpler than it is.

### Accept / Edit / Reject

- **Accept** applies the fragment per `suggested-import-mode` (or `merge` if none), using the standard v1 `extends` and import-mode machinery.
- **Edit** opens the fragment for the receiver to modify; the edited content is re-validated against the harness schema before apply and is recorded as a *user-edited import*, not a verbatim acceptance.
- **Reject** discards the offer. Nothing is applied.

### Apply and provenance

An accepted fragment is applied via the same inheritance mechanism as any other `extends` entry (see [Inheritance](./inheritance.md)) — it gains no special privilege from having arrived through Exchange. The receiver's harness records provenance:

```yaml
extends:
  - source: local://exchange/postgres-mcp-20260309T143022Z
    version: "1.0.0"
    x-exchange-received-from: "blake2b:a3f1e2b4c5d6e7f8"
    x-exchange-received-at: "2026-03-09T14:30:22Z"
```

Implementations without `local://` source resolution SHOULD write the fragment to a conventional path (e.g., `.harness/exchange/postgres-mcp.harness.yaml`) and reference it via a `file://` source.

---

## Transports

The offer envelope is identical regardless of how it travels. Two transports are normative for v2; two are deferred.

- **Clipboard / file (MVP).** The sender writes the envelope to a file or the clipboard; the receiver opens or pastes it. No server, works offline, works across any channel. The correct zero-infrastructure MVP.
- **HTTP pull (production).** The sender posts the offer to a short-lived URL (own server or relay); the receiver fetches it by URL. The relay enforces expiry and single-use, sees only opaque (encrypted) bytes, and is **not** a trust anchor — signature verification is end-to-end. The spec defines a minimal relay API so community-operated relays interoperate.
- **WebSocket relay** and **WebRTC peer-to-peer** are **deferred** beyond initial v2; HTTP pull plus content encryption covers the core use case.

---

## Key Management

A participant generates an ed25519 keypair; the public key is their Exchange identity. The **canonical fingerprint** is `blake2b:` followed by the first 16 hex chars of a BLAKE2b-256 hash of the raw key material; the **display** form groups those chars for visual comparison (`a3f1:e2b4:c5d6:e7f8`). The private key MUST be protected at rest (OS keychain or a password-encrypted file; an unencrypted key file is permitted but MUST warn).

**Key discovery is out of band in v2.** Senders obtain recipient keys through the channels they already use (a GitHub profile, a Registry profile page, direct communication). "I have your key" is part of the trust assertion "I am sending this to you specifically." Automatic key discovery (key servers, verified social links) is v3 scope.

**There is no protocol-level key revocation in v2.** A compromised key is rotated and the new key communicated out of band; offers from a known-compromised fingerprint can be rejected manually. Time-stamped key rotation with a signed revocation log is v3 [Registry](./registry.md) scope.

---

## Relationship to the Schema Layer

Exchange is a transport layer over the v1 fragment format. It does **not** change the `harness.yaml` schema, the inheritance/apply semantics, or the trust model for applied content. What it adds is the signed offer envelope, the consent-first flow, the `harness exchange` CLI surface (in the reference implementation), and the optional relay. What it does not change: a fragment authored today is Exchange-compatible unmodified.

For how Exchange's ed25519 transit identity relates to the Registry/plugin minisign provenance track, see the [crypto map](../security/crypto-map.md). Exchange's threat model is specified in [security/exchange.md](../security/exchange.md).
