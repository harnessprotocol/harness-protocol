---
sidebar_position: 7
---

# Fragments

Fragments are partial harness documents designed for composition. They skip required-field validation and can declare any subset of the full profile schema.

## Declaring a fragment

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
kind: fragment

# Only the sections this fragment contributes:
instructions:
  operational: |
    Always check CI status before merging. Use conventional commits.
```

Setting `kind: fragment` tells the validator to skip checks that would otherwise require `metadata.name` and other profile-level fields.

## Use cases

**Team overlay** — a fragment that applies team conventions on top of a developer's personal harness:

```yaml
kind: fragment

instructions:
  operational: |
    This project uses dbt Cloud. Always run dbt test before committing model changes.
  import-mode: merge

permissions:
  paths:
    readonly:
      - prod_config/
```

**Plugin bundle** — a fragment that adds a curated set of plugins without prescribing other settings:

```yaml
kind: fragment

plugins:
  - name: data-lineage
    source: siracusa5/harness-kit
  - name: explain
    source: siracusa5/harness-kit
```

## Composition

Fragments compose with full profiles via the `extends` field:

```yaml
extends:
  - source: myorg/harness-profiles/team-overlay
```

See [Inheritance](./inheritance) for merge semantics when combining fragments and profiles.
