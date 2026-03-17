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

A **Harness Enhancement Proposal** (HEP) is the mechanism for proposing significant changes to the Harness Protocol. HEPs are modeled after Python PEPs: they provide a structured way to discuss, refine, and record decisions about the protocol.

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

### HEP Lifecycle

```
Draft → Review → Accepted / Rejected / Withdrawn
```

| Status | Meaning |
|--------|---------|
| **Draft** | The HEP is being written and is not yet ready for formal review |
| **Review** | The HEP is complete and open for community discussion |
| **Accepted** | The HEP has been accepted and will be implemented in a future spec version |
| **Rejected** | The HEP was reviewed and will not be adopted |
| **Withdrawn** | The author withdrew the HEP before a decision was reached |

### HEP Numbering

HEPs are numbered sequentially: HEP-1, HEP-2, HEP-3, and so on. HEP-0 is this document (the meta-HEP describing the process). Numbers are assigned when a HEP moves from Draft to Review. To reserve a number, open an issue with the title of your proposed HEP.

### HEP Format

HEPs live in the `heps/` directory (not yet created — it will be initialized with HEP-1). Each HEP is a Markdown file named `hep-NNN.md`. A HEP must contain the following sections:

```
---
title: Short descriptive title
hep: NNN
status: Draft | Review | Accepted | Rejected | Withdrawn
authors: [Name <github-handle>]
created: YYYY-MM-DD
---

## Motivation

Why is this change needed? What problem does it solve? What is the current behavior
and why is it insufficient?

## Specification

The normative change being proposed. Be precise. For schema changes, include the
proposed JSON Schema diff or the new field definition. For behavioral changes,
describe exactly what a conformant implementation must do differently.

## Backward Compatibility

Does this change break existing valid `harness.yaml` files? If so, what is the
migration path? If not, explain why.

## Security Considerations

Does this change affect the security model, trust boundaries, or any
security-sensitive field behavior? If the answer is no, say so explicitly.

## Alternatives Considered

What other approaches were considered and why were they rejected?
```

### Submitting a HEP

1. Open an issue describing the problem you want to solve. This is required before drafting a HEP — it lets the community validate that the problem is real before significant effort goes into the proposal.
2. Once there is rough agreement on the problem, fork the repository, create `heps/hep-NNN.md` (use the next available number), and write the HEP in Draft status.
3. Open a pull request. The PR title should be `HEP-NNN: <title>`.
4. When the HEP is complete, change its status to Review in the PR.
5. Maintainers will facilitate discussion. Once discussion has converged, a maintainer will set the final status and merge or close the PR.

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
