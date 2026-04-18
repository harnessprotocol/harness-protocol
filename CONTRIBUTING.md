# Contributing to the Harness Protocol

Thank you for your interest in contributing. The Harness Protocol is a vendor-neutral open specification, and it improves through contributions from the community.

---

## Scope of Contributions

This repository contains the **specification** — the normative documents, JSON Schema, and examples that define what a conformant implementation must do. It does not contain the harness-kit implementation (that lives at [github.com/harnessprotocol/harness-kit](https://github.com/harnessprotocol/harness-kit)).

Contributions fall into two categories:

- **Editorial changes** — typo fixes, clarifications, improved examples, documentation improvements. These can be submitted as a pull request directly.
- **Spec changes** — new schema fields, behavioral changes, security model changes, new protocol layers, or anything that would affect what conforming implementations must do. These require a HEP.

If you are not sure which category your change falls into, open an issue and ask.

---

## HEP Process

A **Harness Enhancement Proposal** (HEP) is the mechanism for proposing significant changes to the Harness Protocol. HEPs provide a structured way to discuss, refine, and record decisions about the protocol.

### What Requires a HEP

- Adding, removing, or renaming schema fields in `harness.yaml` or `plugin.json`
- Changing the semantics of an existing field (e.g., changing how `import-mode` values are interpreted)
- Changes to the security model, permission system, or trust boundaries
- Introducing a new protocol layer (Exchange, Registry, or any other)
- Changes to the HEP process itself

### What Does NOT Require a HEP

- Fixing typos or grammatical errors in documentation
- Improving or expanding examples
- Adding clarifying prose that does not change normative meaning
- Reorganizing documents without changing content
- Updating cross-references and links

### HEP Types

All HEPs fall into one of three categories:

| Type | Purpose |
|------|---------|
| **Standards Track** | Changes the Harness Protocol normatively: new schema fields, behavioral changes, security model changes, or new protocol layers. Requires a prototype before Accepted. |
| **Informational** | Design guidance, analysis, or documentation. Does not change what conformant implementations must do. Extension sketches, design explorations, and architecture notes fall here. |
| **Process** | Changes to governance, the HEP process itself, or release procedures. |

The `type:` field in the HEP frontmatter identifies which category applies.

### HEP Lifecycle

```
Draft → [sponsor found] → Review → Accepted / Rejected / Withdrawn
  |                          ↑
  └── Dormant ───────────────┘
      (no sponsor after 6 months; revivable — find a sponsor to return to Draft → Review)
```

| Status | Meaning |
|--------|---------|
| **Draft** | The HEP is being written and is not yet ready for formal review |
| **Review** | The HEP has a named sponsor and is open for community discussion |
| **Accepted** | The HEP has been accepted and will be implemented in a future spec version |
| **Rejected** | The HEP was reviewed and will not be adopted |
| **Withdrawn** | The author withdrew the HEP before a decision was reached |
| **Dormant** | The HEP has been in Draft for more than 6 months without a sponsor; it is not rejected and can be revived at any time |

**Dormant is not rejection.** A Dormant HEP means no maintainer has taken it on yet — the idea may still be valid. If circumstances change or a sponsor steps forward, the HEP can be moved back to Draft.

### Sponsor Requirement

Before a HEP can move to Review, it needs a **named maintainer sponsor**. The sponsor is responsible for:

- Reviewing the proposal and providing constructive feedback
- Facilitating community discussion
- Updating the HEP status as it progresses
- Ensuring the proposal meets quality standards before formal review

To find a sponsor: post your Draft HEP in an issue, tag relevant maintainers from [MAINTAINERS.md](MAINTAINERS.md), and ask. The 6-month clock starts when the Draft PR is opened. If no sponsor has claimed the HEP by then, it enters Dormant status — it is preserved and can be revived by any future sponsor.

### Prototype Requirement (Standards Track)

For **Standards Track HEPs**: a working prototype must exist before the HEP can be moved to Accepted. Acceptable prototypes:

- A fork or branch of the reference implementation demonstrating the change
- A JSON Schema test suite validating the proposed additions
- A standalone proof-of-concept showing the proposed behavior works as described

The prototype does not need to be production-ready. Its purpose is to verify feasibility and surface implementation issues before the spec is finalized. Pseudocode is not sufficient.

Informational and Process HEPs may omit the Prototype section.

### HEP Numbering

HEPs are numbered sequentially: HEP-1, HEP-2, HEP-3, and so on. HEP-0 is this document (the meta-HEP describing the process). Numbers are assigned when a HEP moves from Draft to Review. To reserve a number, open an issue with the title of your proposed HEP.

### HEP Format

HEPs live in the [`heps/`](heps/) directory. Each HEP is a Markdown file named `hep-NNN.md`. A HEP must contain the following sections:

```
---
title: Short descriptive title
hep: NNN
type: Standards Track | Informational | Process
status: Draft | Review | Accepted | Rejected | Withdrawn | Dormant
authors: [Name <github-handle>]
sponsor: Name <github-handle> (or "Unsponsored" if in Draft)
created: YYYY-MM-DD
---

## Motivation

Why is this change needed? What problem does it solve? What is the current behavior
and why is it insufficient?

## Specification

The normative change being proposed. Be precise. For schema changes, include the
proposed JSON Schema diff or the new field definition. For behavioral changes,
describe exactly what a conformant implementation must do differently.

## Rationale

Why was this specific design chosen? What tradeoffs were made? How does it align
with the design principles in PRINCIPLES.md? Address any design alternatives that
were considered and why they were not chosen.

## Backward Compatibility

Does this change break existing valid `harness.yaml` files? If so, what is the
migration path? If not, explain why.

## Security Considerations

Does this change affect the security model, trust boundaries, or any
security-sensitive field behavior? If the answer is no, say so explicitly.

## Prototype

[Standards Track only] Link to or describe the prototype implementation. If the
prototype is not yet complete, state that here and note it will be required before
Accepted status.
```

### Submitting a HEP

1. Open an issue describing the problem you want to solve. This is required before drafting a HEP — it lets the community validate that the problem is real before significant effort goes into the proposal.
2. Once there is rough agreement on the problem, fork the repository, create `heps/hep-NNN.md` (use the next available number), and write the HEP in Draft status.
3. Open a pull request. The PR title should be `HEP-NNN: <title>`.
4. Find a sponsor: tag relevant maintainers in the PR and post in any community channels. Add the sponsor's name to the `sponsor:` frontmatter field.
5. When the HEP is complete and has a sponsor, change its status to Review in the PR.
6. Maintainers will facilitate discussion. Once discussion has converged, a maintainer will set the final status and merge or close the PR.

---

## Opening an Issue

Use issues for:

- **Questions** — something in the spec is unclear or you want to understand design intent
- **Bugs in the spec** — a normative statement is incorrect, contradictory, or ambiguous in a way that matters
- **Enhancement ideas** — a change you want to propose before writing a full HEP

Please search existing issues before opening a new one.

---

## Submitting a Pull Request

**Editorial changes** (typos, clarifications, examples):

1. Fork the repository and create a branch.
2. Make your change.
3. Open a pull request with a clear description of what you changed and why.
4. A maintainer will review and merge if appropriate.

**Spec changes**: Open an issue or HEP first. Do not submit a spec-change PR without a prior HEP being Accepted — it will be closed with a request to go through the process.

### What Makes a Good Pull Request

| Harder to review | Thoughtful contribution |
|---|---|
| Large PR mixing unrelated changes | Focused PR addressing one thing |
| Vague commit message ("fix stuff") | Concise message explaining what and why |
| Spec change without a HEP | HEP-first for normative changes |
| No examples or tests | Example YAML or schema test demonstrating the change |
| Submitting with CI failing | All checks green before requesting review |
| PR description restating the diff | PR description explaining motivation and design intent |

---

## AI-Assisted Contributions

AI tools are welcome for drafting, editing, and researching contributions. If you used AI assistance, note it briefly in your pull request description — a single sentence is enough.

The key requirement is that **you understand and stand behind what you contributed**: you can explain the change, articulate why it is needed, and verify that it behaves as described. This matters most for Standards Track HEPs and normative JSON Schema changes, where reviewers may ask you to explain design decisions without the AI.

---

## Validating Examples

The `schema/` directory contains the JSON Schema for `harness.yaml`. You can validate example profiles locally using standard JSON Schema tools.

Using `check-jsonschema` (Python):

```sh
pip install check-jsonschema
check-jsonschema --schemafile schema/draft/harness.schema.json examples/minimal.harness.yaml
```

Using `ajv` (Node.js):

```sh
npm install -g ajv-cli
ajv validate -s schema/draft/harness.schema.json -d examples/minimal.harness.yaml
```

All example files in `examples/` must pass validation. If you add or modify examples, validate them before submitting a PR.

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.
