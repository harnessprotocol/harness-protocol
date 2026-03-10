---
sidebar_position: 1
---

# Extensions Roadmap

The Harness Protocol is designed in layers. The Schema layer (v1) is stable. Exchange and Registry layers are planned.

## Exchange layer (v2)

The Exchange layer adds infrastructure for sharing harnesses across tools and teams.

**Planned features:**

- **Publish** — push a `harness.yaml` to a shared registry
- **Fetch** — pull a harness by name and version
- **Compose** — merge multiple harnesses via the `extends` field with full resolution
- **Integrity** — hash-based verification of plugin manifests
- **AirDrop** — local peer-to-peer harness sharing without a registry

## Registry layer (v2/v3)

The Registry layer adds hosted discovery at `harnessprotocol.ai`.

**Planned features:**

- Search by name, tag, or capability
- Publisher identity and vetting
- Version resolution and deprecation
- Integrity verification at the registry level
- API for programmatic access

## Extension points (design sketches)

The following extension points are under design. They are not part of v1.

| Extension | Status | Description |
|-----------|--------|-------------|
| `hooks` | Sketch | Lifecycle hooks: session-start, session-end, pre-tool, post-tool |
| `compiler-targets` | Sketch | Target-specific overrides for Claude Code, Copilot, Cursor, etc. |
| Exchange (AirDrop) | Sketch | Local peer-to-peer sharing via QR code or direct URL |
| Registry v2 | Planned | Hosted discovery with publisher vetting |
| Registry v3 | Future | Full marketplace with ratings, analytics, and paid tiers |

## Contributing

Extension proposals follow the Harness Extension Proposal (HEP) process. See [CONTRIBUTING](https://github.com/harnessprotocol/harness-protocol/blob/main/CONTRIBUTING.md) for how to submit a proposal.
