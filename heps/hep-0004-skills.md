---
title: First-class skills declaration
hep: 4
type: Standards Track
status: Accepted
authors: [siracusa5 <siracusa5>]
sponsor: siracusa5 <siracusa5>
created: 2026-06-03
---

## Motivation

A **skill** — a named, self-contained capability packaged as a directory with a `SKILL.md` file and optional supporting resources — has become a portable unit of agent capability across the ecosystem. The `SKILL.md` format is widely read: a single skill directory is loaded, unmodified, by a broad set of AI coding tools, and skills are distributed through public marketplaces. The format is now stewarded under the Agentic AI Foundation alongside the other interop standards the Harness Protocol already references.

The Harness Protocol v1 has no way to declare a skill. Skills can only reach a harness *bundled inside a plugin*: a harness author who wants to add one skill must either find a plugin that contains it or author and publish a plugin of their own. This is friction that does not match how skills are actually produced and shared — most skills are standalone directories, not plugin payloads.

The result is a portability gap. A harness can declare the MCP servers, environment, instructions, and permissions an agent needs, but cannot declare the skills it needs — the single most portable capability primitive in the current ecosystem. This HEP closes that gap with a first-class `skills` section, parallel to `plugins` and `mcp-servers`.

## Specification

Add an optional top-level `skills` array to `harness.yaml`. Each item is a skill declaration:

```yaml
skills:
  - name: pdf-forms
    source: harnessprotocol/skills/pdf-forms
    version: ">=1.0.0"
    description: "Fill and extract PDF form fields."
    loading: deferred
    integrity:
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  - name: house-style
    source: ./skills/house-style
    enabled: true
```

Field definitions:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Lowercase kebab-case identifier, max 64 chars, pattern `^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$`. Should match the skill's `SKILL.md` frontmatter `name`. |
| `source` | string | **Yes** | — | `owner/repo`, `owner/repo/path/to/skill`, or `./local/path`. Resolves via the [Source Resolution](../protocol/source-resolution.md) algorithm. |
| `version` | string | No | latest | Semver range constraint for `owner/repo` sources. Ignored for local-path sources. |
| `description` | string | No | — | Display override for this skill in this profile's context. |
| `enabled` | boolean | No | `true` | When `false`, the skill is declared but not activated — used to disable a skill inherited from a parent profile. |
| `loading` | enum (`eager`, `deferred`) | No | `deferred` | `deferred` loads only the skill's metadata at session start and the body on first invocation; `eager` loads the full skill at session start. |
| `integrity.sha256` | string | No | — | Lowercase hex SHA-256 of the skill archive. Implementations SHOULD verify when present and WARN when absent for externally-sourced skills. |

**Inheritance.** The `skills` array is merged by `name` following the same rule as `mcp-servers`: union by name, child wins entirely for a matching name, new names from parent and child are both retained. A child sets `enabled: false` to suppress an inherited skill.

**Resolution order relative to plugins.** A skill bundled by a plugin and a skill declared directly in `skills` are both registered for the session. If a directly-declared skill and a plugin-bundled skill share a `name`, the directly-declared `skills` entry wins (the harness author's explicit declaration is more specific than a transitive plugin payload). A directly-declared entry with `enabled: false` suppresses both an inherited `skills` entry and a plugin-bundled skill of the same name.

**Apply behavior.** Skill content is third-party content subject to the installation-review and provenance requirements in [Skill Behavioral Injection](../security/skill-injection.md) and [Integrity](../security/integrity.md). Declaring a skill does not exempt its content from review.

JSON Schema diff (additive, in `schema/draft/harness.schema.json`): a new optional `skills` array property is added at the top level. No existing property is changed.

## Rationale

**Why a top-level section rather than a plugin sub-field.** The "composable from primitives" principle asks whether a use case can be expressed with existing primitives before adding a new one. Skills *cannot* be expressed today without authoring a plugin, which is heavier machinery (a manifest, a published repository, marketplace indirection) than declaring a single capability. A skill and a plugin are different primitives: a plugin is a bundle that may contribute multiple skills, agents, and servers; a skill is one capability directory. Treating the skill as first-class matches how the artifact is produced and shared.

**Why `loading: deferred` is the default** (unlike `plugins`, which default to `eager`). Skills are progressive-disclosure by construction: only the `name` + `description` need to be present at session start, with the body loaded on demand. Defaulting to `deferred` keeps the initial context small and reflects the format's intended use; an author who needs a skill resident at startup opts into `eager`.

**Why `integrity` is included now.** The "safety by default" and "declared over implicit" principles favor making provenance verifiable. Skill content is executable behavioral instruction fetched from third parties; an integrity hash lets an implementation detect post-publication tampering. It is optional in this version (consistent with `plugins[].integrity`) but is the hook that [HEP-0006](hep-0006-governance-layer.md)'s `policy.require-integrity` can make mandatory.

**Alternatives considered.** (1) *Leave skills inside plugins.* Rejected: forces plugin authorship for a single capability and does not match ecosystem practice. (2) *A flat list of source strings with no per-skill options.* Rejected: loses `enabled`, `loading`, `version`, and `integrity`, all of which have concrete uses (disabling an inherited skill, controlling context cost, pinning, supply-chain verification).

## Backward Compatibility

Additive and backward compatible. `skills` is a new optional top-level field. Every `harness.yaml` valid before this change remains valid. No field is promoted to required, no enum value changes meaning. The `version` field in `harness.yaml` remains `"1"` (this is an optional-field addition per the Schema Versioning rules in [Extension Points](../extensions/extension-points.md)). The published schema `$id` is unchanged.

## Security Considerations

This change increases the surface for skill behavioral injection by making skills easier to add. The existing mitigations in [Skill Behavioral Injection](../security/skill-injection.md) apply unchanged to directly-declared skills: implementations MUST display full `SKILL.md` content before installation and SHOULD surface out-of-scope behavioral directives.

The `integrity.sha256` field strengthens the supply-chain posture by allowing detection of post-publication modification. Externally-sourced skills without an integrity hash SHOULD produce a warning. Implementations that auto-update skills from remote sources MUST pin content at install time and notify users of changes, per the residual-risk guidance in the skill-injection document.

`skills` participates in the [HEP-0006](hep-0006-governance-layer.md) policy ceiling: `policy.skills.allowed-sources` / `denied-sources` constrain which skill sources a profile may declare, and `policy.require-integrity: true` makes the integrity hash mandatory.

## Prototype

Satisfied in-repo per the Standards Track prototype requirement:

- JSON Schema additions in `schema/draft/harness.schema.json`.
- Validating examples in `examples/` (a `skills` block on `examples/data-engineer.harness.yaml`).
- Eval test suite coverage in `eval/src/tests/schema/` (valid and invalid skill declarations) and `eval/src/tests/inheritance/` (union-by-name merge, `enabled: false` suppression).
