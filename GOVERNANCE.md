# Governance — Harness Protocol

This document describes how the Harness Protocol project is governed: who makes decisions, how significant changes are proposed and accepted, and how the project evolves over time.

---

## Project Goals

The Harness Protocol exists to provide a **vendor-neutral, open specification** for AI coding harnesses. The goals that guide governance decisions:

- **Openness** — the specification is public, freely usable, and not controlled by any single vendor or implementation
- **Stability** — published spec versions do not break backward compatibility without a versioned transition
- **Security** — the specification's security model is sound and maintained proactively
- **Simplicity** — the spec covers what it needs to cover and no more; complexity is deferred until it is earned

No single company or implementation owns the protocol. harness-kit is a reference implementation, not the governing body.

---

## Maintainers

Current maintainers are listed in [MAINTAINERS.md](MAINTAINERS.md).

### Responsibilities

Maintainers are responsible for:

- **Spec reviews** — reviewing HEPs, pull requests, and issues; providing timely, substantive feedback
- **HEP process** — facilitating discussion, setting final status on HEPs, ensuring the process is followed
- **Security response** — triaging security reports, coordinating fixes, issuing errata
- **Releases** — tagging spec versions, publishing schema artifacts, updating the changelog
- **Community health** — enforcing the Code of Conduct, keeping discussions productive

Maintainers are expected to act in the interest of the specification and its users, not in the interest of any particular implementation or employer.

### Adding Maintainers

New maintainers are added through the following process:

1. A candidate demonstrates sustained, high-quality contributions to the specification — HEPs, reviews, documentation, or issue triage.
2. An existing maintainer nominates the candidate by opening a pull request adding them to MAINTAINERS.md, with a brief description of their contributions.
3. A two-week objection period begins. Any maintainer may object with written reasoning.
4. If no maintainer objects within two weeks, the PR is merged and the candidate becomes a maintainer.

There is no minimum contribution count — quality and judgment matter more than volume.

### Removing Maintainers

Maintainers may step down at any time by opening a pull request removing themselves from MAINTAINERS.md.

A maintainer who has been inactive for 12 consecutive months (no reviews, no HEP participation, no issue responses) may be moved to emeritus status. The process:

1. An existing maintainer opens an issue noting the inactivity and giving 30 days notice.
2. If the inactive maintainer responds and re-engages, the issue is closed.
3. If there is no response after 30 days, the maintainer is moved to an "Emeritus" section in MAINTAINERS.md. Their prior contributions are acknowledged.

Emeritus maintainers retain no decision-making authority but are welcome to re-engage and return to active status through the normal addition process.

---

## Decision-Making

The Harness Protocol uses a **consensus-seeking** model. Most decisions are made through discussion on issues and pull requests, with maintainers working toward agreement.

For significant changes — anything that requires a HEP — the process is:

1. Discussion on the HEP pull request until objections are resolved or acknowledged
2. A maintainer sets the final status (Accepted or Rejected) based on the discussion
3. When there are multiple maintainers and they disagree, the decision is made by simple majority of active maintainers

For editorial pull requests (typos, clarifications, examples), any single maintainer may merge after a reasonable review period (typically 48 hours for minor changes, one week for larger ones).

The goal is always rough consensus — a decision that the community can live with even if it is not everyone's first choice. Maintainers should document the reasoning for significant decisions in the relevant HEP or issue, so future contributors understand why things are the way they are.

---

## Releases

### Versioning

Spec versions follow semantic versioning: `vMAJOR.MINOR.PATCH`.

- **PATCH** — errata, clarifications that do not change normative meaning
- **MINOR** — new optional fields or behaviors that are backward compatible
- **MAJOR** — breaking changes to the schema or security model (require a HEP and migration guidance)

Protocol layer versions (Schema v1, Exchange v2, etc.) are tracked separately from the overall spec version.

### Release Process

1. Maintainers agree that the spec is ready for a release.
2. CHANGELOG.md is updated to move unreleased items under the new version with today's date.
3. The schema artifact is published to `schema/YYYY-MM-DD/` (a snapshot of the JSON Schema at release time).
4. A git tag is created: `v1.0.0`, `v1.1.0`, etc.
5. The schema URL `https://harnessprotocol.io/schema/v1/harness.schema.json` is updated to point to the new snapshot.

Schema snapshots in `schema/YYYY-MM-DD/` are permanent — once published, they are not modified. This ensures that harness files referencing a specific schema date continue to validate correctly.

---

## Relationship to harness-kit

[harness-kit](https://github.com/harnessprotocol/harness-kit) is the reference implementation of the Harness Protocol. It exercises the spec, validates the design, and provides a working implementation that others can study.

harness-kit does not govern the spec. Decisions about what the spec should say are made through the HEP process in this repository, independent of harness-kit's implementation priorities.

When a HEP is accepted, harness-kit will typically implement it — but harness-kit's release schedule and implementation choices are managed in the harness-kit repository, not here.

Other implementations of the Harness Protocol are welcome and do not require permission. Conformance is defined by the specification, not by any particular implementation.

---

## Amendments to This Document

Changes to this governance document require a HEP. The same consensus-seeking process applies. Governance changes should be approached with particular care — stability in governance processes is itself a project goal.
