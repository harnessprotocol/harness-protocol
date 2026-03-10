# Harness Protocol v1 — Plugin Integrity Verification

**Status:** Draft
**Version:** Harness Protocol v1
**Last updated:** 2026-03-09

---

## What Integrity Verification Protects Against

Plugins are code. When a harness imports a plugin, it fetches an archive from a remote source (`owner/repo`), extracts it, and executes it inside the harness. Any actor who controls that archive controls what executes on the user's machine.

Integrity verification addresses two specific failure modes:

**Supply chain attacks.** A plugin's source repository can be compromised after the profile author tested and published the profile. The attacker pushes a new version of the plugin archive to the repository. Users who re-install or sync the profile get the attacker's archive, not what the profile author reviewed.

**Tampered downloads.** A plugin archive served over HTTPS can be modified in transit by a compromised CDN, a misconfigured caching proxy, or an active network attacker. Without hash verification, the implementation has no way to detect that the bytes it received differ from what was published.

Both attacks succeed silently when the implementation installs whatever bytes arrive, without comparing them to a known-good reference. The `integrity.sha256` field closes this gap by binding the profile — which the user reviewed — to the exact plugin bytes that were tested.

---

## The `integrity.sha256` Field

Each entry in the `plugins[]` array may carry an `integrity` object:

```yaml
plugins:
  - name: sql-assist
    source: harnessprotocol/plugins
    version: "^2.0.0"
    integrity:
      sha256: "a3f1e2b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2"
```

**Format:** `integrity.sha256` is a 64-character lowercase hexadecimal string representing the SHA-256 hash of the plugin archive. The JSON Schema enforces the pattern `^[a-f0-9]{64}$`. Uppercase hex is invalid and will fail schema validation.

**Scope:** The hash covers the plugin archive as fetched — the `.tar.gz`, `.zip`, or equivalent artifact retrieved from the `source` repository. It does not cover the contents after extraction, nor the plugin's resolved configuration. What is hashed is the bytes of the distribution artifact before any unpacking.

**Relationship to `version`.** A semver range constraint like `^2.0.0` narrows which versions the implementation may resolve, but does not pin content. Two releases at the same version number with different bytes are theoretically possible in a compromised or misconfigured registry. Only `integrity.sha256` pins to specific content. A profile can include both:

```yaml
- name: sql-assist
  source: harnessprotocol/plugins
  version: "2.1.3"          # pins to an exact version
  integrity:
    sha256: "..."            # pins to exact content at that version
```

Using both together is the most secure configuration: `version` constrains resolution, `integrity.sha256` verifies the result.

---

## v1 Behavior: OPTIONAL With Mandatory Warning

In Harness Protocol v1, `integrity.sha256` is optional. The schema does not require it. This reflects the reality that many plugins in circulation were published before integrity hashes were standardized, and requiring them immediately would break a large fraction of existing profiles.

However, "optional" does not mean "silent." The v1 rules are:

**When `integrity.sha256` is present:** Implementations MUST verify the hash before installing the plugin. The implementation fetches the archive, computes its SHA-256, and compares it to the declared value. If the hashes match, installation proceeds. If they do not match, the implementation MUST halt installation and report an error. There is no soft-failure path — a hash mismatch is a fatal error, not a warning. The implementation MUST NOT install the plugin if the hash does not match.

**When `integrity.sha256` is absent:** Implementations MUST warn the user before proceeding with installation. The warning must clearly communicate that the plugin's content cannot be verified against a known-good reference, and that the user is accepting whatever bytes are served by the source. The user must acknowledge this warning. Silent installation without integrity verification is not permitted in v1.

**Warning fatigue is a real risk.** If most profiles omit integrity hashes, users will see the warning on every install and learn to dismiss it reflexively. Profile authors distributing profiles publicly should always include `integrity.sha256`. The v1 spec cannot enforce this on authors, but the v2 spec will.

---

## v2 Behavior: Required Hashes and Minisign Signing

v2 will make `integrity.sha256` required for all plugin declarations. The "absent hash" warning path will be eliminated: a profile without an integrity hash on a plugin entry will fail schema validation and be rejected before installation begins.

v2 will also introduce signing, using **minisign** as the signing tool. The choice reflects two design priorities:

- **Simplicity over featureset.** GPG provides a superset of what is needed, but its complexity (key servers, trust rings, web of trust, keyring management) is a practical barrier for plugin authors and users alike. Minisign is purpose-built for file signing: one key pair, one signature file, one verify command.
- **Self-contained deployment over cloud dependency.** Sigstore and Rekor provide transparency logging as a managed service, which is convenient for large ecosystems but introduces an external dependency. The Harness Protocol registry will maintain its own transparency log (described below), making the signing infrastructure self-contained.

In v2, plugin authors will sign their releases with their minisign private key. Profiles will carry both the `integrity.sha256` hash and the plugin author's public key fingerprint. Implementations will verify both: the hash confirms content integrity, the signature confirms authorship. Key distribution will flow through the registry.

---

## How Implementations Compute and Verify Hashes

**For profile authors (computing the hash):**

1. Resolve the plugin source to a download URL using the registry or GitHub releases API.
2. Fetch the plugin archive (the `.tar.gz` or `.zip` as distributed).
3. Compute the SHA-256 of the raw bytes: `sha256sum plugin-archive.tar.gz`
4. Copy the 64-character lowercase hex output into `integrity.sha256`.
5. Verify your setup is correct by re-running steps 2–3 and confirming the hash is identical.

Example (shell):
```sh
curl -sL "https://github.com/harnessprotocol/plugins/archive/v2.1.3.tar.gz" \
  | sha256sum | awk '{print $1}'
# → a3f1e2b4c5d6e7f8a9b0c1d2e3f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8
```

**For implementations (verifying):**

1. Resolve the plugin version using the `source` and `version` fields.
2. Fetch the plugin archive.
3. Compute the SHA-256 of the fetched bytes before writing them to disk.
4. Compare the computed hash to `integrity.sha256` using a constant-time comparison.
5. If the hashes match, proceed with extraction and installation.
6. If the hashes differ, halt with a fatal error. Log the expected hash and the computed hash. Do not install the plugin. Do not log the raw archive bytes.

The comparison must happen before extraction. Installing a plugin from a tampered archive and then rejecting it after the fact is not equivalent — extracted content may already have affected the filesystem.

---

## Key Rotation

When a plugin author rotates their minisign signing key (relevant for v2 signing), previously published versions of the plugin retain their existing `integrity.sha256` values. The hash is a property of the archive bytes, not of the signing key. Existing profiles that pin a hash to an old version remain valid — the hash continues to verify correctly as long as the archive bytes are unchanged.

What key rotation affects in v2: signatures on new releases will use the new key. The registry will maintain the author's key history, allowing verifiers to identify which key signed which release. The transparency log entry for each release includes the key used at the time of publication.

For v1, where hashes are the only mechanism, key rotation is not a concern. The `integrity.sha256` field stands alone.

---

## Transparency Log (v2 Forward-Looking)

In v2, the Harness Protocol registry will maintain an append-only transparency log of all published plugin versions. Each entry in the log records:

- Plugin source (`owner/repo`)
- Published version
- SHA-256 hash of the plugin archive
- Minisign signature over the hash, from the plugin author's key
- Timestamp of publication
- Registry-assigned sequence number

The log is append-only: entries cannot be modified or removed. This provides two security properties:

**Tamper evidence.** If an attacker modifies a plugin archive after publication and attempts to serve the modified bytes, the hash recorded in the transparency log will not match the hash computed from the modified archive. Any implementation that cross-checks against the log (optional in v2, expected in v3) will detect the discrepancy.

**Version history auditability.** Users and implementations can inspect the log to verify that the hash in a profile matches the hash published at the time of the plugin's release. A profile that declares a hash that never appeared in the log for that source+version combination is suspicious.

The transparency log design is informed by Certificate Transparency (RFC 9162) but is narrower in scope: it covers plugin content hashes, not X.509 certificates, and is specific to the Harness Protocol ecosystem.
