# Registry Security

This document specifies the threat model for the **Registry layer** ([protocol/registry.md](../protocol/registry.md), [HEP-8](../heps/hep-0008-registry-layer.md)). The Registry's security posture follows from one design choice: **the registry is an index, not a trust anchor.** It does not host content, does not certify safety, and cannot alter what lives at the GitHub source. Its job is to make published content discoverable and to attest, via a hash and an append-only log, *what was indexed and when* — so that users and implementations can verify rather than trust.

How the Registry's SHA-256 integrity relates to Exchange's ed25519 transit identity and the v3 minisign publisher-signing track is mapped in [crypto-map.md](./crypto-map.md).

---

## Trust Model

The trust chain is explicit:

```
User trusts the GitHub source
  → Registry provides the hash of what it indexed
  → Implementation verifies the fetched content matches the hash
  → User reviews and confirms before applying
```

The registry's hash attests "when this entry was created, the content hashed to this value." It does **not** attest that the content is safe. A profile can carry a valid hash and still contain malicious instructions — which is why the final step (user review at apply time, backed by the protocol's permission, import-mode, and policy controls) is never delegated to the registry.

---

## Threats and Mitigations

### T1 — Index poisoning / typosquatting

An attacker registers a repository whose name or metadata imitates a trusted one, hoping users fetch the malicious copy.

**Mitigation.** The registry mints **no** identifiers of its own — every entry is addressed by its GitHub `owner/repo`, which inherits GitHub's namespace enforcement and is human-verifiable (visit the profile, read the history). The displayed identity is the verifiable GitHub `owner`. The registry never certifies safety, so a poisoned entry gains no "endorsed" status by being indexed; discovery surfaces the source, and the user verifies it before applying. (Verified-author badges that further harden this are v3 scope.)

### T2 — Content altered after indexing

A repository is force-pushed, or a tag is moved, so the content at `owner/repo@ref` no longer matches what was indexed.

**Mitigation.** The registry stores the SHA-256 of the content **at index time** and exposes it via `GET /api/v1/verify` and in the transparency log. A client fetches the document from GitHub, computes the SHA-256 locally, and compares. A mismatch is detectable and signals that either the GitHub ref was altered after indexing or the registry was tampered with. Registering tags (immutable by convention) rather than branches narrows this surface.

### T3 — Silent delisting / censorship

A registry operator removes content from the index without acknowledgement, suppressing legitimate content or hiding a removal.

**Mitigation.** Delisting is an **append-only transparency-log event** with an enumerated `reason`; content is marked delisted, never silently dropped. The registry **cannot** remove a record from the log, and an index entry that is absent from the log signals tampering. Delisting grounds in v2 are narrow (schema invalidity, manifest malicious intent, author request, legal requirement) and explicitly exclude "opinionated," "broad permissions," or "aggressive instructions." Appeals follow [GOVERNANCE.md](../GOVERNANCE.md).

### T4 — "Valid hash means safe" confusion

A user assumes that because a profile is indexed and its hash verifies, it is safe to apply.

**Mitigation.** This conflation is rejected in the normative trust model and surfaced in UI guidance: integrity attests *provenance of bytes*, not *benignity of content*. The registry is documented as a discovery convenience, not a certifier. The apply-time review step — with `replace` import-mode confirmation, permission declarations, and any managed `policy` ceiling — remains the control that decides whether content is used.

### T5 — Registry compromise or tampering

The registry's own index or transparency log is tampered with by an attacker who gains control of the service.

**Mitigation (v2, partial).** The transparency log is auditable: anyone can verify that the current index matches the historical log, and hashes let clients detect content substitution end-to-end (a compromised registry cannot make altered GitHub content verify against an honest hash, nor forge a hash for content it does not control without it being detectable against GitHub). v2 relies on TLS plus the public log for log integrity; **v3 adds minisign-based registry signing** so clients can verify the registry's index entries cryptographically, independent of the TLS channel. This residual exposure is the primary reason signing is on the v3 roadmap.

---

## Residual Risks

| Risk | Status in v2 |
|------|--------------|
| No cryptographic proof of registry-index integrity (relies on TLS + public log) | Mitigated by the transparency log; v3 adds minisign registry signing |
| No verified-author identity | v2 shows the verifiable GitHub `owner`; v3 adds signed verified-author badges |
| User trusts the index instead of the source | Mitigated by explicit "not a trust anchor" model + UI guidance; ultimately a user-education boundary |
| Malicious-but-valid content is indexed | By design: the registry is not a publication filter; harm is handled reactively via delisting + apply-time review |

The throughline: the Registry guarantees **what** was indexed and **when**, **auditably**, and lets anyone **verify** that a fetch matches. It deliberately does not guarantee that indexed content is benign — that judgment stays with the user at apply time, exactly as for any other `owner/repo` source.
