---
sidebar_position: 6
---

# Permissions

The `permissions` section expresses declarative capability intent — what this harness needs to function. Enforcement is the responsibility of the conforming implementation.

## Format

```yaml
permissions:
  tools:
    allow:
      - Read
      - Glob
      - Bash
      - mcp__postgres__*
    deny:
      - mcp__*__drop_*
      - mcp__*__delete_*
    ask:
      - mcp__postgres__execute_migration

  paths:
    writable:
      - models/
      - seeds/
    readonly:
      - prod_config/

  network:
    allowed-hosts:
      - "*.github.com"
      - "pypi.org"
```

## Semantics

| Field | Description |
|-------|-------------|
| `tools.allow` | Tools the harness explicitly requires |
| `tools.deny` | Tools the harness explicitly forbids — should be blocked even if the runtime would otherwise allow them |
| `tools.ask` | Tools that require user confirmation each time |
| `paths.writable` | Filesystem paths the harness may write to |
| `paths.readonly` | Filesystem paths the harness may read but not modify |
| `network.allowed-hosts` | Hosts the harness is allowed to connect to |

Glob patterns are supported (`mcp__*__drop_*`, `*.github.com`).

## Least privilege principle

Harnesses should declare the minimum permissions they need. Conforming implementations should:

- Surface permission declarations to users at apply time
- Warn when a harness requests broad permissions (e.g. `allow: ["*"]`)
- Apply the permission model at the tool-call level where the runtime supports it

## Declarative, not authoritative

The `permissions` section documents intent — it does not grant permissions. The actual permission model is enforced by the tool (Claude Code, Copilot, etc.) based on its own security model. A harness cannot grant itself permissions the tool doesn't support.
