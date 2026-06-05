---
title: Team governance layer (managed policy)
hep: 6
type: Standards Track
status: Accepted
authors: [siracusa5 <siracusa5>]
sponsor: siracusa5 <siracusa5>
created: 2026-06-03
---

## Motivation

The Harness Protocol composes profiles additively: a child `extends` a parent, and the child's values override the parent's. This is the right model for *building up* a configuration, but it is the wrong model for *constraining* one. There is no way for an organization to say "these are the only MCP servers anyone here may connect, and no profile — however it is composed — may exceed this set of tool permissions." Every grant a parent makes, a child can widen.

This is the gap that keeps the protocol from being adopted as a team format. The industry has converged on a layered model where an organization-managed layer sits *above* project and user configuration and acts as a ceiling: it can forbid and cap, and downstream layers can narrow but never widen it. Teams use this layer to maintain allowlists of approved MCP servers, plugins, and marketplaces; to cap tool and network grants; and to require provenance verification. A portable harness format with no equivalent forces every organization back into per-tool, vendor-specific policy mechanisms — the precise fragmentation the protocol exists to remove.

This HEP adds an optional `policy` section that expresses managed constraints as a ceiling, and defines how that ceiling resolves against the existing inheritance chain.

## Specification

### The `policy` section

Add an optional top-level `policy` object to `harness.yaml`:

```yaml
policy:
  mcp-servers:
    allowed-sources: ["io.github.acme/*", "io.modelcontextprotocol/*"]
    denied-sources: ["*/experimental-*"]
  plugins:
    allowed-sources: ["acme/*"]
    allowed-marketplaces: ["acme/internal-marketplace"]
  skills:
    allowed-sources: ["acme/*", "harnessprotocol/skills/*"]
  permissions:
    tools:
      allow: ["Read", "Grep", "Glob", "Edit", "Write", "Bash", "mcp__*"]
      deny: ["mcp__*__drop_*", "mcp__*__delete_*"]
    network:
      allowed-hosts: ["*.acme.internal", "api.anthropic.com"]
  require-integrity: true
```

Fields:

| Field | Type | Meaning |
|-------|------|---------|
| `policy.mcp-servers.allowed-sources` | string[] | Allowlist of MCP server source/host patterns. A declared server matching none is rejected. |
| `policy.mcp-servers.denied-sources` | string[] | Denylist of MCP server source/host patterns. Deny overrides allow. |
| `policy.plugins.allowed-sources` | string[] | Allowlist of plugin `owner/repo` patterns. |
| `policy.plugins.denied-sources` | string[] | Denylist of plugin patterns. Deny overrides allow. |
| `policy.plugins.allowed-marketplaces` | string[] | Allowlist of marketplaces/registries plugins may be fetched from. |
| `policy.skills.allowed-sources` | string[] | Allowlist of skill source patterns. |
| `policy.skills.denied-sources` | string[] | Denylist of skill source patterns. Deny overrides allow. |
| `policy.permissions.tools.allow` | string[] | Ceiling: the maximum set of tools that may be granted. A profile cannot grant a tool matching none of these. |
| `policy.permissions.tools.deny` | string[] | Tools always denied regardless of any grant. Deny overrides allow. |
| `policy.permissions.network.allowed-hosts` | string[] | Ceiling: maximum set of network hosts that may be contacted. |
| `policy.require-integrity` | boolean (default `false`) | When `true`, every plugin, skill, and MCP server package MUST carry a verifiable integrity hash; declarations without one are rejected. |

### Precedence semantics (the managed layer)

The effective configuration is computed by the [application pipeline](../protocol/application.md). This HEP inserts a **policy enforcement step** that runs *after* `extends` resolution and merging produce a candidate effective configuration, and *before* the configuration is applied:

1. The `extends` chain resolves and merges as defined in [Inheritance](../protocol/inheritance.md), producing a candidate effective configuration. **`policy` itself does not merge like other sections — see below.**
2. The effective `policy` is the **union of all `policy` sections in the resolution set** (parents and child), combined so that constraints only ever *accumulate*: allowlists intersect (a source must satisfy every policy that defines an allowlist for that category), denylists union, permission ceilings intersect, and `require-integrity` is `true` if any layer sets it `true`. A child cannot relax a policy a parent established.
3. The candidate configuration is checked against the effective policy:
   - Any `mcp-servers`, `plugins`, or `skills` entry whose source/host is not permitted by the relevant allowlist, or is matched by a denylist, causes a **validation error** — the harness is not applied (per the "validate early" principle; there is no partial application).
   - Any `permissions.tools.allow` or `permissions.network.allowed-hosts` entry outside the corresponding policy ceiling is an error. `policy.permissions.*.deny` is unioned into the effective deny set.
   - If `require-integrity` is `true`, any plugin/skill/MCP-server-package declaration lacking a verifiable integrity hash is an error.

The rule in one sentence: **a profile may narrow what a policy permits, never widen it.**

### Where a policy comes from

A `policy` section may appear in any harness document, but it is meaningful when that document is a *managed* root that other profiles extend or that an implementation injects as an organization layer. The protocol does not mandate *how* an implementation sources the managed layer (MDM, a server-pushed document, a committed org profile referenced via `extends`); it defines only that, once present in the resolution set, a `policy` constrains the result as above. This mirrors the converged managed → project → local → user model while leaving sourcing to the implementation.

JSON Schema diff (additive, in `schema/draft/harness.schema.json`): a new optional `policy` object property is added at the top level.

## Rationale

**Why this is a new primitive and not expressible with `extends`.** The "composable from primitives" principle requires checking existing primitives first. `extends` is strictly additive with child-override: there is no direction in which it forbids or caps. A ceiling that downstream layers cannot widen is a fundamentally different relation than override. It cannot be built from `extends`, fragments, or plugins. The new primitive is therefore justified.

**Why constraints accumulate rather than override.** If `policy` merged with child-wins like other sections, a child could simply re-declare a laxer policy and escape the ceiling, defeating the purpose. Accumulation (intersect allows, union denies, monotonic `require-integrity`) is the only merge rule under which a managed layer is actually enforceable. This is the inverse of normal section merge, and the asymmetry is the point — it is why `policy` needs its own resolution rule.

**Why validation error, not silent drop.** The "validate early" and "safety by default" principles say a misconfigured harness should fail clearly, not degrade silently. A profile that requests a forbidden server should not start with that server quietly removed (the author would not know their harness is running degraded); it should fail with a clear policy-violation error so the author fixes the profile or the policy.

**Why declaration, not enforcement, remains the protocol's job.** As with `permissions`, the protocol specifies what a conformant implementation must reject at apply time, but the runtime enforcement boundary (sandbox, OS permissions) is the implementation's. `policy` makes governance *portable and auditable*; it does not replace runtime controls. This keeps the protocol declarative.

**Alternatives considered.** (1) *Reuse `permissions` with a "locked" flag.* Rejected: `permissions` is per-profile capability intent; a ceiling that spans MCP servers, plugins, skills, marketplaces, and integrity is broader and needs its own structure. (2) *A separate document `kind: policy`.* Rejected as heavier than needed; a `policy` section composes with the existing `extends`/fragment machinery and a managed root is just a profile with a `policy`. A future HEP can add a dedicated kind if sourcing needs formalization. (3) *Make `policy` merge like other sections.* Rejected — unenforceable, as above.

## Backward Compatibility

Backward compatible. `policy` is a new optional top-level field; a document without it imposes no constraints, which is exactly today's behavior. No existing document changes meaning, no field becomes required, and the `version` field remains `"1"`. The only new failure mode is opt-in: it applies only when a `policy` is present in the resolution set, and only to profiles that violate it. The schema `$id` is unchanged.

## Security Considerations

This change strengthens the security model and is the primary team-readiness control. It lets an organization:

- bound the MCP servers, plugins, and skills that any composed profile may bring in (supply-chain containment, directly responsive to skill/MCP capability-artifact supply-chain risk);
- cap tool and network grants below what an individual profile might otherwise request (least privilege as a ceiling, not a suggestion);
- require provenance verification org-wide via `require-integrity`.

The ceiling is only as strong as the implementation's enforcement of it; like `permissions`, `policy` is declarative and depends on the runtime honoring the apply-time validation. Implementations MUST treat a policy violation as a fatal validation error, not a warning, and MUST NOT silently strip violating entries. Because a child can never widen an accumulated policy, a managed root remains authoritative regardless of how deep or wide the `extends` graph beneath it is.

A residual risk: `policy` constrains what a harness *declares*, not what a tool can do outside the harness. It is a governance layer over harness-declared capability, complementary to — not a replacement for — runtime sandboxing and OS-level permission enforcement.

## Prototype

Satisfied in-repo:

- JSON Schema additions in `schema/draft/harness.schema.json` (the `policy` object).
- Validating example in `examples/team-overlay.harness.yaml` (a `policy` block on the team overlay).
- Eval test suite coverage in `eval/src/tests/schema/policy.test.ts` (policy shape, valid and invalid).
- Normative specification of the accumulation rule and the enforcement step in `protocol/inheritance.md` and `protocol/application.md` (Step 5: Enforce Policy).

The ceiling-enforcement engine (accumulating policies across an `extends` chain and rejecting widening) is a runtime behavior; it is specified normatively here and is implemented in the reference implementation rather than the schema-validation eval harness. The schema tests verify the declaration surface; the prose specifies the apply-time semantics a conformant implementation MUST enforce.
