# Exchange Protocol (v2) — Harness Fragment Sharing

**Status:** Design Sketch (pre-HEP)
**Target:** Harness Protocol v2
**Last updated:** 2026-03-09

---

## Purpose

The Exchange layer defines how harness fragments travel between people. In v1, the only way to share a fragment is to commit it to a GitHub repository and tell someone the `owner/repo` path. That works for stable, team-maintained fragments, but it breaks down for the cases that come up constantly in practice:

- You want to share a fragment with a teammate right now, before it has a permanent home
- You want to receive a fragment from a colleague and preview its contents before deciding whether to use it
- You want to try a fragment someone posted in a forum thread without first standing up a full GitHub repo
- You want to send someone a personally configured setup — specific tool permissions, a custom MCP server — as a one-shot transfer

The Exchange layer is designed for these cases. It is the AirDrop for harnesses: a push-based, consent-required sharing flow that lets two people exchange fragments without requiring a registry, a GitHub account on both ends, or a persistent server.

The v1 fragment format is complete and stable. Exchange adds a **transport envelope and a flow**, not new schema concepts.

---

## Core Design Decisions

### Fragments are the unit of exchange

The Exchange protocol operates on `kind: fragment` documents, not full profiles. A profile is a complete, directly-applicable harness — profiles are not exchanged peer-to-peer because they carry assumptions (file paths, organization-specific settings, personal env vars) that make them unsuitable for direct transfer without review. A fragment is a composable piece: one MCP server, one plugin bundle, one instruction block. That is what people actually want to share.

A sender wraps a fragment in a signed envelope. The receiver sees the fragment contents before deciding to apply it.

### Consent-first flow

The Exchange flow has a mandatory preview step. A sender cannot cause a fragment to be applied without the receiver seeing it first. There is no "push and apply" shortcut. The flow is:

```
Offer → Preview → Accept / Edit / Reject → Apply
```

This is not just UX polish. It is a security property: the Exchange protocol cannot be used to push configuration changes to a receiver's harness without their knowledge.

### Self-sovereign identity

Exchange identity uses ed25519 public keys, not accounts on a central server. A user generates a keypair; their public key fingerprint is their identity for Exchange purposes. There is no registration step, no email verification, no central authority that can revoke keys or deny participation.

The tradeoff: there is also no global revocation, and there is no way to verify that a key belongs to a specific human without an out-of-band channel. The trust model is "I recognize this key fingerprint" rather than "this key is certified to belong to Alice." For peer-to-peer sharing, this is appropriate.

---

## The Offer Envelope

An offer is a JSON document that wraps a fragment with provenance metadata and a signature.

```json
{
  "version": "1",
  "type": "offer",
  "sender": {
    "key": "<ed25519-public-key-hex>",
    "display": "siracusa5"
  },
  "message": "Here's the postgres MCP config I mentioned — adjust DB_CONNECTION_STRING for your replica.",
  "fragment": {
    "version": "1",
    "kind": "fragment",
    "metadata": {
      "name": "postgres-mcp",
      "description": "PostgreSQL MCP server via uvx mcp-server-postgres"
    },
    "mcp-servers": {
      "postgres": {
        "transport": "stdio",
        "command": "uvx",
        "args": ["mcp-server-postgres", "--connection-string", "${DB_CONNECTION_STRING}"]
      }
    },
    "env": [
      {
        "name": "DB_CONNECTION_STRING",
        "description": "PostgreSQL connection string",
        "required": true,
        "sensitive": true
      }
    ],
    "instructions": {
      "import-mode": "skip"
    }
  },
  "suggested-import-mode": "merge",
  "expires": "2026-03-16T00:00:00Z",
  "signature": "<detached-ed25519-signature-over-canonical-fragment-bytes>"
}
```

### Field semantics

**`version`** — The envelope format version. Always `"1"` for this design. Receivers must reject envelopes with an unrecognized version and surface a clear error.

**`type`** — Must be `"offer"`. The protocol may define other envelope types in the future (e.g., `"receipt"` for acknowledgment). Receivers must reject unknown types.

**`sender.key`** — The sender's ed25519 public key, hex-encoded. This is the identity of the sender. Receivers should display the key fingerprint (first 16 hex chars, in groups of 4: `a3f1:e2b4:c5d6:e7f8`) rather than the raw key.

**`sender.display`** — An optional, unverified display name. Receivers must not treat this as authenticated — it is a hint only. The only authenticated identity is the key fingerprint.

**`message`** — An optional human-readable message from the sender. Displayed to the receiver at preview time.

**`fragment`** — The fragment being offered. This is a complete, valid `harness.yaml` document serialized as a JSON object (YAML-equivalent fields, JSON types). It must validate against the v1 schema with `kind: fragment` semantics before the envelope is considered well-formed.

**`suggested-import-mode`** — A hint from the sender about how the fragment should be applied. Values: `merge`, `replace`, `skip`. The receiver is not obligated to honor this — it is a suggestion. The receiver's implementation sets the actual `import-mode` used, and the receiver can edit it at the Accept step.

**`expires`** — An ISO 8601 timestamp after which the offer should be considered stale. Receivers must not apply an expired offer. The expiry prevents replay attacks: an offer intercepted in transit cannot be applied indefinitely.

**`signature`** — A detached ed25519 signature over the canonical bytes of the `fragment` field, produced by the sender's private key. "Canonical bytes" means the fragment serialized as canonical JSON (keys sorted, no insignificant whitespace). The signature covers only the fragment content, not the envelope metadata — this is intentional: metadata like `message` and `expires` is not security-critical content, and the signature asserts only "I created this fragment," not "I created this message on this date."

### Signature verification

Receivers must verify the signature before displaying the preview. If verification fails, the offer is rejected and the receiver sees an error:

```
Exchange error: signature verification failed.
This offer may have been tampered with in transit. Do not apply it.
Sender key: a3f1:e2b4:c5d6:e7f8
```

Signature verification failure is always a hard rejection. There is no "proceed anyway" prompt.

### Envelope encryption

For transports where the envelope is transmitted over a potentially observable channel (relay, HTTP), the fragment payload should be encrypted to the receiver's public key using X25519 Diffie-Hellman key exchange. The envelope format supports an `encrypted-fragment` field in place of the plaintext `fragment` field:

```json
{
  "version": "1",
  "type": "offer",
  "sender": { "key": "...", "display": "..." },
  "recipient": { "key": "<recipient-ed25519-public-key-hex>" },
  "encrypted-fragment": {
    "algorithm": "x25519-xsalsa20-poly1305",
    "nonce": "<base64-encoded-nonce>",
    "ciphertext": "<base64-encoded-ciphertext>"
  },
  "expires": "...",
  "signature": "..."
}
```

The `signature` in encrypted envelopes covers the `encrypted-fragment.ciphertext` bytes. The sender proves they encrypted valid fragment content; the receiver decrypts and then validates the decrypted content against the v1 schema.

Encryption is required when:
- The transport is a relay server (the relay operator should not see fragment contents)
- The receiver's public key is known to the sender at offer creation time

Encryption is optional when:
- The transport is clipboard or file (local, no network intermediary)
- The transport is a direct peer-to-peer channel

---

## The Exchange Flow

### Step 1: Offer

The sender runs:

```sh
harness exchange offer --to siracusa5 path/to/my-fragment.harness.yaml
```

Or, with an explicit key:

```sh
harness exchange offer --to-key a3f1e2b4c5d6e7f8... path/to/my-fragment.harness.yaml
```

The implementation:
1. Validates the fragment against the v1 schema with `kind: fragment` semantics.
2. Signs the canonical fragment bytes with the sender's private key.
3. Constructs the offer envelope.
4. Delivers the envelope to the receiver via the selected transport.

If no `--to` or `--to-key` is specified, the implementation creates a standalone offer (unaddressed) suitable for clipboard or file transport. Unaddressed offers are not encrypted.

### Step 2: Preview

The receiver's implementation displays the offer contents before any decision:

```
Exchange offer from: siracusa5 (key: a3f1:e2b4:c5d6:e7f8)
Message: "Here's the postgres MCP config I mentioned..."
Signature: VERIFIED
Expires: 2026-03-16 00:00 UTC

Fragment contents:
---
kind: fragment
metadata:
  name: postgres-mcp
  description: PostgreSQL MCP server via uvx mcp-server-postgres

mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres, --connection-string, "${DB_CONNECTION_STRING}"]

env:
  - name: DB_CONNECTION_STRING
    required: true
    sensitive: true
---

[A]ccept   [E]dit   [R]eject
```

The preview must show:
- The sender key fingerprint (not just the `display` name)
- Signature verification status
- The full, untruncated fragment content
- All `env` declarations, with `sensitive: true` entries highlighted
- All MCP server commands

The preview must not:
- Apply any part of the fragment before the receiver's decision
- Hide or truncate fragment content to make it appear simpler

### Step 3: Accept / Edit / Reject

**Accept as-is**: The fragment is applied to the receiver's harness per the `suggested-import-mode`, or `merge` if no suggestion was provided.

**Edit**: The receiver opens the fragment in an editor before applying. The edited content is re-validated against the v1 schema before apply. The signature is noted as "modified by receiver" in provenance metadata — the apply is considered a user-edited import, not a verbatim acceptance of the sender's content.

**Reject**: The offer is discarded. Nothing is applied. The sender is not notified (pull and clipboard transports are inherently asynchronous; relay transports may support an optional rejection receipt).

### Step 4: Apply

Accepted fragments are applied via the standard v1 inheritance mechanism. The fragment is:

1. Validated against the v1 schema.
2. Added to the receiver's `extends` array (with `source` pointing to the local copy, or a registry entry if the receiver chooses to publish it first).
3. Applied per the inheritance and import-mode rules.

The receiver's harness file is updated with:

```yaml
extends:
  - source: local://exchange/postgres-mcp-20260309T143022Z
    version: "1.0.0"
    x-exchange-received-from: "a3f1:e2b4:c5d6:e7f8"
    x-exchange-received-at: "2026-03-09T14:30:22Z"
```

The `x-exchange-received-from` and `x-exchange-received-at` annotations preserve provenance in the receiver's harness for audit purposes. Implementations that do not support local:// source resolution should write the fragment to a conventional local path (e.g., `.harness/exchange/postgres-mcp.harness.yaml`) and reference it via `file://` source.

---

## Transport Options

The exchange protocol is transport-agnostic. The offer envelope is the same regardless of how it travels. Four transport mechanisms are under consideration:

### Clipboard / File (MVP)

The simplest transport. The sender creates an offer envelope and writes it to a file or copies it to the clipboard. The receiver opens the file or pastes from the clipboard, and their implementation parses the envelope and begins the flow.

```sh
# Sender
harness exchange offer my-fragment.harness.yaml --out postgres-offer.json
# or
harness exchange offer my-fragment.harness.yaml --clipboard

# Receiver
harness exchange accept postgres-offer.json
# or
harness exchange accept --clipboard
```

**Advantages:** No server required. Works offline. Works across any communication channel (email, Slack, AirDrop). The simplest possible implementation.

**Disadvantages:** Not interactive. No delivery confirmation. The offer JSON is visible to anyone who sees the file or clipboard contents (though unaddressed offers should not contain secrets by design).

**Recommendation:** This is the correct MVP transport. It unblocks the use case with zero infrastructure cost. The other transports are improvements, not prerequisites.

### HTTP Pull (recommended for v2 production)

The sender posts the offer to a short-lived URL (either their own server or a relay). The receiver fetches it by URL and begins the flow.

```sh
# Sender — posts offer, gets a share URL
harness exchange offer my-fragment.harness.yaml
> Offer created: https://exchange.harnessprotocol.ai/o/a3f1e2b4
> Expires: 2026-03-16 00:00 UTC

# Receiver — fetches by URL
harness exchange accept https://exchange.harnessprotocol.ai/o/a3f1e2b4
```

**Advantages:** The share URL is shareable over any channel (chat, email, QR code). Single-use links prevent replay. The relay server can enforce expiry.

**Disadvantages:** Requires a relay server. The relay operator sees offer metadata (not contents if encrypted). Relay server availability affects whether exchange works.

**Trust consideration:** The relay server is a convenience infrastructure, not a trust anchor. It relays opaque bytes. Signature verification is end-to-end; the relay cannot forge a valid signature. Content encryption ensures the relay cannot read the fragment payload.

### WebSocket Relay

A persistent WebSocket connection to a relay server allows real-time push from sender to receiver. The sender and receiver both connect to the relay, the sender pushes the offer, and the receiver's client surfaces the preview immediately.

**Advantages:** Interactive. The sender gets real-time confirmation that the offer was received.

**Disadvantages:** Both parties must be online simultaneously. Adds connection management complexity. The latency benefits over HTTP pull are modest for this use case.

**Assessment:** WebSocket relay is appropriate when building a future "live collaboration" harness experience, but is over-engineered for the core exchange use case. Deferred beyond initial v2.

### WebRTC Peer-to-Peer

Direct browser-to-browser (or CLI-to-CLI) channel established via ICE/STUN, with an initial signaling exchange through a relay. After signaling, the actual offer travels directly between peers.

**Advantages:** True peer-to-peer after signaling. No relay sees content even without application-layer encryption.

**Disadvantages:** Significant implementation complexity. Requires NAT traversal infrastructure. CLI implementation is non-trivial. Overkill for a use case that clipboard/file handles adequately.

**Assessment:** Not recommended for v2. Revisit if there are strong privacy requirements that HTTP pull plus content encryption cannot satisfy.

---

## Relationship to v1 Fragments

The Exchange protocol is a transport layer on top of the v1 fragment format. No changes to the `harness.yaml` schema are required for Exchange to work. A fragment authored today is Exchange-compatible without modification.

What Exchange adds:
- The signed offer envelope format
- The Offer → Preview → Accept/Edit/Reject → Apply flow
- The `harness exchange` CLI subcommand (implemented in harness-kit)
- The optional relay server infrastructure

What Exchange does not change:
- The `harness.yaml` schema — fragments remain exactly as v1 defines them
- The inheritance and apply semantics — applied fragments follow the same merge rules as any `extends` entry
- The trust model for applied content — once applied, a fragment from Exchange is subject to the same security constraints as any other `extends` entry

---

## Key Management

### Key generation

```sh
harness exchange keygen
> Generated keypair at ~/.harness/exchange/
>   Private key: ~/.harness/exchange/identity.key (mode 0600)
>   Public key:  ~/.harness/exchange/identity.pub
>   Fingerprint: a3f1:e2b4:c5d6:e7f8:a9b0:c1d2:e3f4:a5b6
```

The private key must be protected at rest. Implementations should use the operating system keychain or a password-encrypted key file. Unencrypted key files are permitted but must generate a warning.

### Key discovery

There is no automatic key discovery in v2. Senders obtain receiver public keys through the same out-of-band channels they use to communicate: GitHub profile (key published in a gist or repository), Harness Registry profile page, or direct communication.

This is by design: key discovery infrastructure (key servers, verified social links) is v3 scope. In v2, the exchange is explicit — "I have your key" is part of the trust assertion "I am sending this to you specifically."

### Key revocation

v2 has no protocol-level key revocation. If a key is compromised, the owner generates a new keypair and communicates the change out-of-band.

This is a known limitation. v3 registry integration will add time-stamped key rotation with a signed revocation log. Until then, offers from a compromised key can be identified by fingerprint and receivers can reject them manually.

---

## Open Questions for HEP

The following design questions remain unresolved and should be addressed in the formal HEP:

1. **Relay server trust model**: If harnessprotocol.ai operates the official relay, what are the availability, privacy, and governance commitments? What happens to offers when the relay is down? Should the spec define a relay API so community members can operate compatible relays?

2. **Key fingerprint format**: Should the fingerprint be the first 16 chars of the hex key (as used above), or a full BLAKE2b hash of the key material? The latter is more collision-resistant; the former is more human-memorable for visual comparison.

3. **Offer receipt protocol**: Should there be a protocol-level mechanism for the receiver to send a signed receipt back to the sender (confirming receipt and whether it was accepted)? This improves the sender experience but adds complexity and could be privacy-reducing.

4. **Addressbook / known-keys management**: How does `harness exchange` manage known sender keys? Should there be an `exchange trust-key` command? Should trusted keys persist in `~/.harness/exchange/known-keys` in a format compatible with SSH's `known_hosts`?

5. **Fragment storage**: Where do received fragments live on disk? `.harness/exchange/` is proposed above. Should they be committed to the repository, or treated as local-only? Can a received fragment be promoted to a published registry entry in one command?

6. **Team distribution**: The current design is peer-to-peer. Should Exchange also support one-to-many distribution (sender posts an offer, multiple team members can accept)? This blurs the boundary with the Registry layer. Define the scope boundary.
