---
title: Adopt the Harness Enhancement Proposal Process
hep: 1
type: Process
status: Accepted
authors: [siracusa5 <siracusa5>]
sponsor: siracusa5
created: 2026-04-18
---

## Motivation

The Harness Protocol v1 is at Candidate status and inviting implementation feedback. Before external contributors can propose normative changes, a formal process must exist for evaluating, discussing, and recording those proposals. Without it, the protocol has no structured way to accept or reject changes and no audit trail of design decisions.

## Specification

The HEP process is defined in [CONTRIBUTING.md](../CONTRIBUTING.md#hep-process). This HEP formally adopts that process as the canonical mechanism for proposing significant changes to the Harness Protocol.

Key process elements:

- **What requires a HEP**: schema field changes, security model changes, new protocol layers, changes to the HEP process itself
- **HEP types**: Standards Track (normative changes, prototype required), Informational (design guidance), Process (governance)
- **Lifecycle**: Draft → Review → Accepted / Rejected / Withdrawn; Dormant for unsponsored drafts after 6 months
- **Numbering**: sequential, assigned at Review; HEP-0 is CONTRIBUTING.md itself (the process description)
- **Format**: frontmatter with title, hep, type, status, authors, sponsor, created; body sections per CONTRIBUTING.md

## Rationale

The process mirrors established open-standards practices (Python PEPs, IETF RFCs, OpenAPI proposals) with two adaptations for a small project:

1. **Sponsor requirement instead of quorum**: a single named maintainer sponsor is required to advance a HEP to Review, rather than requiring a vote. This fits a project that may have very few maintainers early on.

2. **Dormant status instead of automatic rejection**: unsponsored HEPs after 6 months become Dormant rather than Rejected. Ideas may be valid but lack a champion; this preserves them for future contributors rather than silently closing them.

The process is defined in CONTRIBUTING.md rather than in a separate governance document to keep it discoverable at the point where contributors are already reading about how to contribute.

## Backward Compatibility

This HEP establishes a new process. It does not change any existing normative spec content and does not break any valid `harness.yaml` files.

## Security Considerations

No effect on the security model, trust boundaries, or security-sensitive field behavior.
