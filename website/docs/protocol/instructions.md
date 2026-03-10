---
sidebar_position: 5
---

# Instructions

Instructions are injected into the AI harness at apply time — they become part of the agent's operational context.

## Format

```yaml
instructions:
  operational: |
    This harness is configured for data engineering work with PostgreSQL and dbt.
    Prefer set-based SQL rewrites over row-by-row loops.
    Check the dbt model DAG before modifying a shared source model.
  behavioral: |
    When debugging slow queries, start with EXPLAIN ANALYZE before suggesting
    schema changes. Propose incremental dbt model refactors rather than full rewrites.
  import-mode: merge
```

## Fields

| Field | Description |
|-------|-------------|
| `operational` | System-level guidance: what this harness is for, domain constraints, conventions |
| `behavioral` | How the agent should approach problems in this context |
| `import-mode` | How to combine with existing instructions (see below) |

## Import modes

| Mode | Behavior |
|------|----------|
| `merge` | Append to existing CLAUDE.md / AGENT.md instructions. **Default.** |
| `replace` | Overwrite existing instructions entirely. Warn the user before applying. |

`merge` is the default because it preserves the user's existing safety rules and project conventions. `replace` is available for harnesses that need precise control but should be used sparingly.

## Security note

Instructions can shape agent behavior significantly. Harnesses from untrusted sources should have their instructions reviewed before import. See [Instruction Injection](../security/instruction-injection) for the threat model.
