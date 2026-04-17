# Agents (v2)

**Status:** Design Sketch (pre-HEP)
**Target:** Harness Protocol v2

---

## Purpose

12 of 15 surveyed AI coding tools support sub-agents or multi-agent workflows. The patterns range from Claude Code's 6 built-in agents with custom definitions, to Roo Code's boomerang orchestration, to Copilot's `.agent.md` files, to Devin's Managed Devins for multi-session orchestration.

The Harness Protocol v1 has no native agent concept. The `agents` section lets a harness profile declare named agents with per-agent model selection, permissions, instructions, and isolation modes — enabling portable multi-agent workflows.

---

## Reserved Field in v1

The `agents:` top-level key is **reserved** in the v1 schema:

```
Error: 'agents' is a reserved field. The agents system is specified in Harness Protocol v2.
```

---

## Design Principles

### Agents are named configurations, not executables

An agent in the Harness Protocol is not a binary or a service — it is a named bundle of configuration (model + instructions + permissions + isolation) that a tool can instantiate. The tool decides how to implement agents (subprocess, worktree, container, etc.).

### Agents inherit from the parent harness

By default, an agent inherits the parent harness's instructions, permissions, and environment. The agent definition overrides only what it declares. This follows the same inheritance model as `extends`.

### Resolution order

The `agents` section depends on the `models` section (agents default to `models.main` for their model). Implementations must resolve the `models` section before resolving agent defaults. If `models.main` is not declared, agents without an explicit `model` field use the tool's built-in default model.

### Agents are optional

Tools that do not support multi-agent workflows ignore the `agents` section. The compiler emits a warning when targeting a tool without agent support and includes the agent definitions as reference documentation in the operational instructions.

---

## Planned Schema

```yaml
agents:
  reviewer:
    description: Reviews code changes for security and quality issues
    model: anthropic/claude-sonnet-4-5-20250514
    instructions: |
      You are a code reviewer. Focus on:
      - Security vulnerabilities (OWASP top 10)
      - Logic errors and edge cases
      - Performance regressions
      Do not suggest style changes.
    tools:
      allow: [Read, Grep, Glob]
      deny: [Write, Edit, Bash]
    isolation: worktree

  architect:
    description: Plans implementation approach before coding begins
    model: anthropic/claude-opus-4-20250514
    instructions: |
      You are a software architect. Analyze the codebase and produce
      a step-by-step implementation plan. Do not write code.
    tools:
      allow: [Read, Grep, Glob, Bash]
      deny: [Write, Edit]

  test-writer:
    description: Writes tests for new or changed code
    model: anthropic/claude-sonnet-4-5-20250514
    instructions: |
      Write comprehensive tests for the code changes. Follow existing
      test patterns in the codebase.
    tools:
      allow: [Read, Write, Edit, Grep, Glob, Bash]
```

### Field definitions

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `description` | string | No | — | Human-readable description. Used in agent selection UIs and compiler output. |
| `model` | string | No | Inherits from `models.main` | Model reference (same `provider/model-id` format as the `models` section). |
| `instructions` | string | No | Inherits from parent | Agent-specific instructions. Combined with parent instructions per `instructions-mode`. |
| `instructions-mode` | enum | No | `append` | How agent instructions combine with parent: `append` (agent instructions added after parent), `replace` (agent instructions replace parent entirely), `prepend` (agent instructions added before parent). |
| `tools.allow` | array | No | Inherits from parent `permissions.tools.allow` | Tools this agent may use. |
| `tools.deny` | array | No | Inherits from parent `permissions.tools.deny` | Tools this agent may not use. |
| `isolation` | enum | No | `none` | Execution isolation: `none` (shares parent context), `worktree` (git worktree), `container` (Docker/sandbox). |
| `timeout` | string | No | `30m` | Maximum execution time for this agent. Format: Go duration string. |

---

## Patterns from the Ecosystem

### Claude Code — Markdown agent definitions

Claude Code defines agents as markdown files with YAML frontmatter:

```markdown
---
name: reviewer
model: sonnet
tools: [Read, Grep, Glob]
---
Review code changes for security issues.
```

The Harness Protocol `agents` section compiles to this format for the Claude Code target.

### Roo Code — Boomerang orchestration

Roo Code's "boomerang" pattern uses an Orchestrator mode that has no direct tools — it can only delegate to specialized modes (Code, Architect, Debug). Each mode returns a summary. This maps to a harness agent definition where the orchestrator has `tools.deny: ["*"]` except for a delegation tool.

### Copilot — .agent.md files

GitHub Copilot supports custom agents via `.agent.md` files with frontmatter:

```markdown
---
tools: [read_file, edit_file, terminal]
mcp-servers: [postgres]
model: claude-sonnet-4-5
---
Instructions for this agent.
```

The Harness Protocol `agents` section compiles to `.agent.md` for the Copilot target.

### Devin — Managed Devins

Devin supports multi-session orchestration where a coordinator session spawns child sessions. This is the most extreme form of agent isolation (separate cloud VMs). The harness `isolation: container` maps loosely to this pattern.

---

## Compiler Target Mapping

| Harness concept | Claude Code | Codex CLI | Copilot | Cursor | Cline | Roo Code |
|---|---|---|---|---|---|---|
| Agent definition | `.claude/agents/<name>.md` | `[agents.<name>]` in config | `.agent.md` files | Custom agents (markdown) | Subagent config | `.roomodes` + Orchestrator |
| Per-agent model | `model:` frontmatter | Per-agent model field | `model:` frontmatter | Per-agent model | Per-mode model | Per-mode sticky model |
| Per-agent tools | `tools:` frontmatter | Per-agent tool list | `tools:` frontmatter | Per-agent tool list | N/A | Per-mode tool groups |
| Isolation | `isolation: worktree` | N/A | N/A | N/A | Per-agent cost tracking | Mode-based delegation |

Tools without agent support (Aider, Continue, Windsurf, JetBrains AI Assistant): the compiler includes agent definitions as documentation in the operational instructions.

---

## Evidence Base

- 12/15 tools support sub-agents or multi-agent workflows
- Claude Code: 6 built-in agents + custom definitions via markdown frontmatter
- Roo Code: boomerang orchestrator with context isolation and summary-based result flow
- Copilot: `.agent.md` with per-agent tools/model/MCP
- Devin: Managed Devins for multi-session orchestration
- Kilo Code: custom subagents with per-agent model, temperature, permissions

Source: `research/ai-coding-tools/feature-matrix.md`
