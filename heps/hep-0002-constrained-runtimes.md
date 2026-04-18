---
title: Add "Constraints enable autonomy" design principle
hep: 2
type: Informational
status: Accepted
authors: [siracusa5 <siracusa5>]
sponsor: siracusa5
created: 2026-04-18
---

## Motivation

The Harness Protocol's design choices — strict schema validation, required declarations, opinionated merge semantics, explicit permission grants — favor constraint over flexibility. The rationale for this orientation appears in scattered form across the spec but is not named as a first-class design principle.

Without a named principle, HEP authors and implementers lack a rubric for evaluating proposals that trade constraint for flexibility or compatibility. The result is that arguments for relaxing validation, making fields optional, or softening enforcement feel symmetric with arguments for tightening them. They are not symmetric: the evidence from production AI-maintained codebases is clear that constraint improves AI output quality in ways that flexibility cannot recover from retroactively.

This HEP names that finding as a design principle so that future proposals can reference it explicitly.

## Specification

Add a new principle to `protocol/principles.md` and its website mirror `website/content/docs/reference/principles.mdx`:

---

**Constraints enable autonomy**

The counter-intuitive finding from production AI-maintained codebases is that imposing specific architectural patterns, enforced module boundaries, and standardized structures *improves* AI-generated code quality rather than limiting it.

The mechanism: constraint reduces the solution space. Agents given an unconstrained design space make choices that are locally reasonable but globally inconsistent. Constrained agents have fewer degrees of freedom, producing code that is easier to verify, maintain, and compose.

The protocol therefore favors opinionated constraint enforcement over flexibility. Schema-required declarations, strict validation, explicit permission grants, and enforced merge semantics are not bureaucratic overhead — they are the harness doing its job. An implementation that relaxes constraints to be "more compatible" undermines the purpose of the harness.

A corollary: as AI systems generate more of a codebase, the rigor that was distributed across human review and careful writing relocates into the harness. The harness is not a convenience layer — it is where engineering discipline lives in an AI-assisted development workflow.

---

## Rationale

This principle is informational — it names an existing orientation of the spec rather than changing what conformant implementations must do. No schema field is added or modified. The principle's role is evaluative: it gives HEP authors and reviewers a rubric when a proposal argues for relaxing a constraint or making a field optional.

**Source evidence.** The finding is drawn from Böckeler's analysis of the OpenAI codebase maintenance project and Chad Fowler's "Relocating Rigor" framing (see `research/ai-engineering/harness-engineering-codebase.md`). The mechanism — constraint reducing solution space, improving verifiability — has been reproduced across multiple production AI engineering contexts and is not specific to any one project.

**Placement.** The principle follows the six existing principles. It is the most recent addition and does not fit naturally between any existing pair — placing it last signals that it emerged from observed practice rather than first-principles design.

**Type: Informational.** This HEP does not propose a normative change. No prototype is required.

## Backward Compatibility

No schema changes. No normative behavioral changes. All existing valid `harness.yaml` files remain valid.

## Security Considerations

No effect on the security model, trust boundaries, or security-sensitive field behavior. The principle reinforces the existing security posture (strict validation, explicit declarations) without changing any enforcement mechanism.
