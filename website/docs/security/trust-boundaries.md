---
sidebar_position: 2
---

# Trust Boundaries

The Harness Protocol defines four trust zones. Conforming implementations must enforce these boundaries.

## Zone 1: User-authored content

Files the user writes directly — their own `harness.yaml`, `CLAUDE.md`, `AGENT.md`. These are fully trusted.

## Zone 2: Verified plugin sources

Plugins from sources the user has explicitly added and reviewed. Trust is established by:

1. The user adding the source (`/plugin marketplace add owner/repo`)
2. The runtime verifying the plugin manifest signature (Exchange layer, when implemented)

## Zone 3: Unverified plugin sources

Plugins referenced in an imported harness but not previously installed. These should be treated as untrusted until:

- The user reviews the plugin source
- The plugin manifest passes integrity checks

## Zone 4: Remote services

Remote MCP servers (http transport) and external registry endpoints. These are always untrusted:

- Their responses may contain adversarial content
- Tool outputs from remote servers should not be injected verbatim into AI context
- Credentials for remote services must flow through `env` declarations, never hardcoded

## Boundary enforcement

Conforming implementations must:

- Display trust zone information to users at apply time
- Require explicit confirmation before installing plugins from Zone 3 sources
- Apply sandboxing to remote MCP server tool calls where the runtime supports it
- Never silently apply `instructions` from unverified sources
