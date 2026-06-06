# Exchange Security

This document specifies the threat model for the **Exchange layer** ([protocol/exchange.md](../protocol/exchange.md), [HEP-7](../heps/hep-0007-exchange-layer.md)). Exchange moves a fragment from a sender to a receiver over an untrusted channel, so its security properties are about **authenticity, consent, and confidentiality in transit** — not about making received content inherently trustworthy. An applied fragment is subject to the same trust constraints as any other `extends` entry; Exchange grants it no privilege.

The cryptographic primitives here (ed25519, X25519) and how they relate to the Registry/plugin provenance track (SHA-256, minisign) are mapped in [crypto-map.md](./crypto-map.md).

---

## Trust Model

Exchange uses **self-sovereign identity**: a participant is an ed25519 public key, with no central authority that can certify, register, or revoke it. The authenticated identity is the key fingerprint, and nothing else — `sender.display` is an unverified hint. The trust assertion a receiver makes is "I recognize this fingerprint," established out of band (the sender told me their key through a channel I trust). This is the appropriate model for peer-to-peer sharing; it is explicitly weaker than a certified-identity model, and the gaps (no global revocation, no human-to-key binding) are documented limitations addressed in v3.

---

## Threats and Mitigations

### T1 — Forged or tampered offer

An attacker fabricates an offer, or modifies a fragment in transit (e.g., injecting a malicious MCP server command into an otherwise benign fragment).

**Mitigation.** Every offer carries a detached ed25519 `signature` over the canonical-JSON fragment bytes (or, when encrypted, over the ciphertext). Receivers MUST verify the signature **before** preview. Verification failure is a **hard rejection** with no "proceed anyway" path. An attacker who cannot produce a valid signature for the sender's key cannot forge or alter content undetected; an attacker who substitutes their *own* key changes the fingerprint the receiver sees, defeating a "I recognize this fingerprint" trust check.

### T2 — Instruction / skill injection via a shared fragment

A fragment is a legitimate vector for behavior change: it can declare instructions, skills, MCP servers, and permissions. A malicious sender could craft a fragment whose instructions attempt to subvert the receiver's agent (see [Instruction Injection](./instruction-injection.md) and [Skill Injection](./skill-injection.md)).

**Mitigation.** The flow is **consent-first**: there is no "push and apply." The receiver MUST see a mandatory preview showing the full untruncated fragment, every `env` declaration (with `sensitive` entries highlighted), and every MCP server command, before deciding. Truncating or hiding content to make a fragment look simpler is prohibited. After acceptance, the fragment is applied through the standard pipeline and is subject to the same import-mode confirmation, permission, and policy constraints as any `extends` entry — `replace` import-mode still requires explicit confirmation, and a managed `policy` ceiling still applies. Exchange cannot be used to bypass those controls.

### T3 — Replay of an intercepted offer

An attacker captures an offer (e.g., from a relay or a shared file) and re-delivers it later.

**Mitigation.** Every offer carries an `expires` timestamp; receivers MUST NOT apply an expired offer. HTTP-pull relays SHOULD additionally enforce single-use links. Expiry bounds the window in which a captured offer is useful and prevents indefinite replay.

Note that `expires` is envelope metadata and is **not** covered by the signature (which spans only the fragment/ciphertext bytes), so an attacker with write access to relay storage could extend it. Relay implementations therefore MUST enforce expiry against their own admission clock rather than trusting the offer's `expires` field alone, and receivers SHOULD reject offers whose `expires` is implausibly far in the future.

### T4 — Relay or channel observation of fragment contents

When an offer travels over a relay or HTTP, the operator (or a network observer) could read the fragment, which may reference sensitive `env` variables or reveal internal configuration.

**Mitigation.** For observable transports where the recipient's key is known, the payload MUST be encrypted to the recipient using X25519 + XSalsa20-Poly1305 (`encrypted-fragment`). The relay then handles only opaque bytes and is never a trust anchor — it cannot read contents and cannot forge a valid signature. Unaddressed offers MUST NOT be encrypted and MUST NOT carry secret material, since they are readable by anyone who holds the file or link.

### T5 — Identity spoofing / impersonation

An attacker sets `sender.display` to "alice" to impersonate a trusted colleague.

**Mitigation.** `display` is explicitly UNVERIFIED; the preview MUST show the key **fingerprint**, not just the display name, and the receiver's trust decision MUST be based on the fingerprint. Because the fingerprint is a BLAKE2b-256 hash of the key material (not a truncation of structured key bytes), it resists fingerprint-collision attacks aimed at making a malicious key visually match a trusted one.

### T6 — Key compromise without revocation

v2 has no protocol-level key revocation. If a sender's private key is stolen, the attacker can produce valid offers under that identity.

**Mitigation (partial).** This is a documented v2 limitation. A compromised key is rotated and the new key communicated out of band; receivers can reject offers from a known-compromised fingerprint manually. v3 Registry integration adds time-stamped key rotation with a signed revocation log. Until then, the blast radius is bounded by T3 (expiry) and by the fact that every applied fragment still passes through the consent-first preview.

---

## Residual Risks

| Risk | Status in v2 |
|------|--------------|
| No global key revocation | Accepted limitation; rotate + out-of-band notice; v3 adds signed rotation log |
| No human-to-key binding | Accepted by design (self-sovereign); v3 adds optional verified social links |
| Receiver ignores the fingerprint and trusts `display` | Mitigated by mandatory fingerprint display; ultimately a user-education boundary |
| Malicious-but-honestly-signed fragment | Out of scope for Exchange transit security — handled by consent-first preview and the same apply-time controls as any `extends` entry |

The throughline: Exchange guarantees **who** sent **what**, **un-tampered**, and that the receiver **saw it before applying it**. It does not and cannot guarantee that the content is benign — that judgment stays with the receiver at the preview step, backed by the protocol's existing permission, import-mode, and policy controls.
