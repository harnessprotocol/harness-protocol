# Extension Points and Protocol Evolution

**Status:** Normative — Harness Protocol v1+
**Scope:** Governs all versions

---

## Purpose

The Harness Protocol is designed to evolve. New fields will be added, new layers will ship, and implementations will develop their own conventions for features that are not yet standardized. This document describes the mechanisms by which the protocol extends itself — and by which implementations extend it — without breaking existing harness documents or fragmenting the ecosystem.

There are three distinct extension mechanisms:

1. **The `x-` prefix convention** — for implementation-specific fields that do not need to be standardized
2. **Reserved fields** — for protocol capabilities that are planned but not yet specified
3. **The HEP process** — for changes that need to be standardized and adopted by all conformant implementations

Understanding which mechanism applies to a given extension is the key question. Using the wrong mechanism produces either needless lock-in (a standards process for something only one implementation will ever use) or ecosystem fragmentation (diverging ad-hoc extensions that should have been standardized).

---

## The `x-` Prefix Convention

Any field in a `harness.yaml` document whose key begins with `x-` is an extension field. The core schema does not define their structure or semantics. Conformant implementations must:

1. **Not reject** a harness document solely because it contains unrecognized `x-` fields. An `x-` field from another implementation must not cause validation failure.
2. **Silently ignore** `x-` fields they do not support. No warning, no error.
3. **Not allow** `x-` fields to shadow or override core schema fields. An `x-` field named `x-permissions` cannot change how `permissions` is evaluated.

`x-` fields can appear at the top level or nested within any map-valued section of the document.

### When to use `x-`

Use `x-` for features that:

- Are specific to one implementation and unlikely to ever need standardization
- Are experimental and not yet ready for a standards process
- Represent convenience features that do not affect the harness's core behavior (plugins, MCP servers, instructions, permissions)

### Examples

```yaml
# Claude Code: use a specific model for this session
x-claude-model: claude-opus-4
x-claude-thinking-budget: 10000

# VS Code extension: associate this harness with a specific workspace layout
x-vscode-workspace: true
x-vscode-workspace-layout: side-by-side

# harness-kit: opt into an experimental feature flag
x-harness-kit-experimental-federation: true

# Custom tooling: hint for an internal toolchain
x-acme-corp-deploy-env: staging
```

None of these affect what a conformant implementation does. They are read by the implementation that understands them and ignored by everyone else.

### `x-` fields are not portable

Authors who use `x-` fields must document which implementation(s) support them. A harness file with `x-claude-model: claude-opus-4` is fully valid, but a user applying it with a non-Claude-Code implementation should not expect the model hint to have any effect.

When an `x-` field becomes widely useful — when multiple implementations independently want to support the same concept — it is a candidate for standardization through the HEP process.

---

## Vendor Namespacing

For implementation-specific features beyond simple hints, use a vendor-namespaced `x-{vendor}-{field}` pattern:

```yaml
# harness-kit marketplace integration
x-harness-kit-marketplace: harnessprotocol/harness-kit

# A hypothetical Cursor-specific override
x-cursor-model-override: gpt-4o

# An internal CI/CD annotation
x-acme-pipeline-id: "pipe-42"
```

Vendor namespacing prevents collisions. Two implementations that independently decide to use `x-marketplace` for different things will conflict in harness files used across both. Two implementations that use `x-harness-kit-marketplace` and `x-cursor-marketplace` will not.

**Recommended vendor identifiers:**

| Implementation | Vendor prefix |
|---|---|
| harness-kit | `x-harness-kit-` |
| Claude Code (if Anthropic ships their own fields) | `x-claude-` |
| Cursor | `x-cursor-` |
| Windsurf | `x-windsurf-` |
| GitHub Copilot | `x-copilot-` |
| Private/internal tooling | `x-{your-org}-` |

These are conventions, not enforced constraints. There is no registry of vendor prefixes. If two vendors collide on a prefix, that is their problem to resolve, not the spec's. Authors of harness files that are intended to be shared publicly should use specific, distinctive vendor prefixes.

---

## Reserved Fields

Reserved fields are top-level keys that are:
- Not yet defined in the current schema version
- Explicitly set aside for future protocol use
- Treated as validation errors if used in the current version

Reserved fields exist to prevent the ecosystem from evolving incompatible schemas for planned features in the window between "we know this is coming" and "the HEP is finalized."

### Currently reserved fields

The following top-level keys are reserved in v1:

| Field | Reserved for | Expected version |
|---|---|---|
| `hooks` | Lifecycle hooks system | v2 |
| `compiler-targets` | Compiler target declarations | v2 |
| `registry` | Registry integration metadata | v2/v3 |
| `exchange` | Exchange layer declarations | v2 |

**Validation behavior for reserved fields:**

```
Error: 'hooks' is a reserved field in Harness Protocol v1.
This field is scheduled for specification in v2.
- Use 'x-hooks' for experimental/implementation-specific hook configuration.
- See https://harnessprotocol.ai/extensions/hooks for the v2 design sketch.
```

The error message points to the design sketch and suggests the `x-` workaround if the user needs the feature now.

### How fields get reserved

A field becomes reserved when:

1. A HEP is accepted that designates the field as a planned addition to a future schema version, AND
2. The current schema version is updated to add the field to the reserved list

A field does not become reserved just because someone proposes it. The HEP must be accepted before the reservation is added. This prevents the reserved list from becoming a wishlist.

### Unreserving a field

When the HEP for a reserved field is accepted and the field is added to the schema, the reservation is removed from the list and the field becomes a first-class schema citizen. Documents that previously would have received a "reserved field" error will now validate successfully.

---

## Schema Versioning

The Harness Protocol uses two distinct version numbers that are easy to confuse:

1. **The `version` field in `harness.yaml`** — the protocol schema version that the document targets (`"1"` for v1)
2. **The spec release version** — the overall specification release (`v1.0.0`, `v1.1.0`, etc.), tracked in CHANGELOG.md and git tags

These evolve at different rates. A spec release of `v1.3.0` still produces documents with `version: "1"` as long as the changes are backward-compatible additions.

### What triggers a new `version` value

The `version` field in `harness.yaml` changes when:

- A new **required** field is added to profiles (documents without it must fail validation)
- An existing field's semantics change in a breaking way (e.g., an enum value changes meaning)
- A field is removed from the schema (documents using it would be invalid under the new version)

These changes are breaking by definition. They require a new version string, migration guidance, and a compatibility window.

### Additive changes (do not change `version`)

The following changes are additive and do not require a new `version` value:

- New **optional** fields added to the schema
- New **optional** enum values added to existing enum fields
- New **optional** sections added to the schema
- Clarifications to existing semantics that do not change valid document structure
- Deprecation of a field (the field remains valid; a new preferred field is added)

Documents that use `version: "1"` continue to validate correctly against future schemas that only add optional fields. This is the backward compatibility guarantee.

### What "backward compatible" means precisely

A schema change is backward compatible if and only if:

> Every `harness.yaml` document that was valid before the change is still valid after the change.

The converse is not required. New optional fields may be invalid in the old schema (the old schema would reject unknown fields), but documents written against the old schema will continue to work against the new schema. Implementations that load old documents should treat unrecognized optional fields as absent (using field defaults), not as errors.

---

## Backward Compatibility Guarantees

The Harness Protocol makes the following explicit guarantees to harness authors:

### Guarantee 1: Optional fields remain optional

A field that is optional in schema version `N` will be optional in all future schemas that retain the same `version` value. The protocol will not promote an optional field to required within a version.

If a field needs to become required, a new `version` value must be introduced, with a documented migration path.

### Guarantee 2: No removals within a version

Fields will not be removed from a schema version without a deprecation cycle. The deprecation cycle is:

1. The field is marked deprecated in the spec documentation with a note indicating the preferred alternative.
2. A full major schema version passes during which the field remains valid but deprecated.
3. In the next major schema version, the field may be removed.

"Full major schema version" means: if `version: "1"` deprecates a field, the field remains valid in `version: "1"` indefinitely. It may be absent from `version: "2"`.

### Guarantee 3: v1 documents validate forever

A document that was valid when written against `version: "1"` will continue to validate against any schema that retains the `version: "1"` designation. The spec will not retroactively invalidate existing v1 documents.

This guarantee applies to the JSON Schema artifact at `schema/YYYY-MM-DD/`. Once published, a schema snapshot is permanent and immutable. The canonical URL `https://harnessprotocol.ai/schema/v1/harness.schema.json` may be updated to point to newer snapshots, but all published snapshots remain accessible at their dated URLs.

### Guarantee 4: Enum additions are additive

New values added to existing enum fields are backward compatible as long as the new values are optional. Implementations that encounter an unrecognized enum value in a field where they expect one of the known values should treat it as "unknown/unsupported" rather than a fatal error. This allows new enum values to be added without breaking existing implementations immediately.

**Example**: If v2 adds `import-mode: overlay` as a new enum value, a v1 implementation that encounters `import-mode: overlay` should emit a warning ("import-mode value 'overlay' is not supported in this implementation") rather than rejecting the document. Users on v1 implementations should upgrade to use the new value.

---

## The HEP Process for Protocol Changes

The HEP (Harness Enhancement Proposal) process governs all changes that would affect what conformant implementations must do. The full process is defined in CONTRIBUTING.md. This section summarizes the path from "I have an idea" to "this is in the spec":

### When a HEP is required

A HEP is required for:
- Adding a new top-level field to `harness.yaml` (even optional ones)
- Changing the semantics of any existing field
- Adding or changing values in any enum
- Introducing a new protocol layer (Exchange, Registry, etc.)
- Changing trust boundaries, permission semantics, or security-relevant behavior
- Formalizing a currently-reserved field
- Changing this governance document

A HEP is not required for:
- Fixing typos or clarifying documentation
- Adding or improving examples
- Adding a new entry to the target mapping table in compiler-targets.md (editorial PR only)
- Implementation-level choices that do not affect spec conformance

### Proposing a new extension point

The typical path for a community-proposed extension:

**Stage 1: Problem statement** (GitHub issue)

Before writing a HEP, open an issue describing the problem you want to solve. The issue should focus on the use case and why existing mechanisms are insufficient. For example: "I need to express that certain tools should only run when the user is working in a specific directory, but the current `permissions.paths` model doesn't support conditional constraints." Getting early feedback on whether the problem is real and in-scope prevents wasted HEP-writing effort.

**Stage 2: Draft HEP** (pull request)

Write a HEP following the format in CONTRIBUTING.md. The draft should include:

- Motivation: what problem does this solve?
- Specification: exactly what schema change is proposed? Include the JSON Schema diff or the new field definition.
- Backward compatibility: does this break existing v1 documents? If so, what is the migration path?
- Security considerations: does this change the security model?
- Alternatives considered: what else was evaluated and why was it rejected?

For extension points specifically, the HEP should also address:

- Why `x-{vendor}-{field}` is not sufficient (if the field is already in use as an extension)
- What implementations are expected to do if they do not support the new field (default behavior)
- Whether the field should be reserved first (if it will be a while before a HEP is ready)

**Stage 3: Review** (community discussion on the pull request)

The HEP status moves to "Review." Community members and maintainers discuss the proposal. The author revises the draft based on feedback. The goal is rough consensus — a decision the community can live with.

**Stage 4: Decision** (maintainers set final status)

A maintainer sets the final status: Accepted, Rejected, or Withdrawn. If Accepted, the spec is updated to include the new field, and the CHANGELOG records the addition.

**Stage 5: Implementation** (harness-kit and other implementations)

Accepted HEPs become implementation targets. harness-kit typically implements accepted HEPs in the next minor or major release. Other implementations are not obligated to implement them immediately, but a conformant implementation is expected to recognize and handle the new field (at minimum, not rejecting documents that contain it).

### Objection handling

If a maintainer objects to an accepted HEP proposal, they should document the objection in writing on the pull request. The objection must identify the specific concern (security issue, scope creep, backward compatibility problem, design flaw) rather than a general preference. The author may address the objection with a revision, and the discussion continues until the objection is resolved or the HEP is rejected.

Objections based on implementation difficulty in a specific tool are noted but not dispositive. The spec should not be designed around the limitations of a particular implementation's current codebase.

---

## Stability Commitment

The Harness Protocol's value to the ecosystem depends on stability. A format that changes frequently forces harness authors to constantly update their files and forces implementation authors to constantly keep up. The spec makes an explicit stability commitment:

**Major schema versions will be rare.** A new `version` value (breaking change) requires extraordinary justification — a security flaw in the existing model, a fundamental design error that cannot be worked around additively, or a community consensus that the cost of migration is worth the benefit. Convenience is not sufficient justification.

**Optional field additions will be the primary evolution mechanism.** Most useful additions can be expressed as new optional fields with sensible defaults. This mechanism is backward compatible and requires only a spec update, not a migration guide.

**Reserved fields are advance notice.** When the spec reserves a field name for a future feature, it is committing to a specific design direction. If the design changes significantly before the HEP is finalized, the reservation should be updated or released.

**The spec will not chase implementation trends.** New AI tool features will emerge that could theoretically be expressed in `harness.yaml`. Many of them should not be. The spec's scope is intentionally narrow: configuration that is meaningful across implementations. Tool-specific features belong in `x-{vendor}-{field}` extensions, not in the core schema.
