---
sidebar_position: 3
---

# Integrity

Harness integrity ensures that a `harness.yaml` and its referenced plugins haven't been tampered with between authoring and application.

## Schema layer (v1)

At the Schema layer, integrity is limited to:

- JSON Schema validation of the `harness.yaml` structure
- Source verification (the user must have explicitly added the plugin marketplace)

Hash-based integrity verification is an Exchange layer feature.

## Exchange layer (planned)

The Exchange layer will add:

```yaml
# Future: integrity fields on plugin declarations
plugins:
  - name: data-lineage
    source: siracusa5/harness-kit
    version: "0.3.1"
    integrity: sha256-abc123...   # hash of plugin.json at that version
```

Conforming Exchange implementations must:

1. Compute the hash of the fetched plugin manifest
2. Compare it against the declared `integrity` value
3. Refuse to install if hashes don't match

## Recommendations for v1 implementors

While awaiting Exchange-layer integrity, implementations should:

- Pin plugin sources to specific versions (`version: "0.3.1"` not `version: ">=0.3.0"`)
- Log the resolved version and commit SHA at apply time for auditability
- Warn users when installing from unpinned version ranges
