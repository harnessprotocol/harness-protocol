# Session & Memory (v2)

**Status:** Design Sketch (pre-HEP)
**Target:** Harness Protocol v2

---

## Purpose

14 of 15 surveyed AI coding tools support session persistence (resume, checkpoints, or named sessions). 13 of 15 have some form of memory or knowledge persistence across sessions. The Harness Protocol v1 has no way to express session or memory preferences.

The `session` and `memory` sections let a harness profile declare how sessions should be managed and where knowledge should persist — enabling portable session behavior across tools.

**Ecosystem note (June 2026).** Session and memory state has become a significant portability problem: long-running sessions and cross-session memory are now standard, but state and memory formats are tool-specific and proprietary, making them one of the harder lock-in surfaces to escape. A portable `session`/`memory` section cannot standardize the *storage* format, but it can declare the portable *intent* — persistence policy, memory scope and location, retention — so a team can express "where knowledge persists" once. This sketch remains pre-HEP; the design should stay declarative and avoid encoding any single tool's session-store layout.

---

## Reserved Fields in v1

Both `session:` and `memory:` top-level keys are **reserved** in the v1 schema.

---

## Session

### Design Principles

Session management is highly implementation-specific. The spec does not prescribe *how* a tool implements sessions — only what behavior the harness author expects. Tools that cannot honor a session preference emit a warning and fall back to their default behavior.

### Planned Schema

```yaml
session:
  persistence: auto       # auto | manual | none
  max-turns: 100          # Maximum agent turns per session (0 = unlimited)
  max-cost: 5.00          # Maximum cost in USD per session (0 = unlimited)
  checkpoint: shadow-git  # shadow-git | snapshot | none
```

### Field definitions

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `persistence` | enum | No | `auto` | `auto`: tool saves sessions automatically and supports resume. `manual`: user must explicitly save. `none`: sessions are ephemeral. |
| `max-turns` | integer | No | 0 | Maximum agent turns (tool calls + responses) per session. Maps to Claude Code's `--max-turns`, Windsurf's 20 tool calls per prompt. 0 = unlimited. |
| `max-cost` | number | No | 0 | Maximum cost in USD per session. Maps to Claude Code's `--max-budget-usd`. 0 = unlimited. Tools without cost tracking ignore this field. Tools that use non-USD units (Windsurf credits, Devin ACUs, Copilot premium requests) should approximate the conversion to USD or ignore the field and note the limitation in their compiler output. |
| `checkpoint` | enum | No | `none` | `shadow-git`: create shadow git commits for undo/redo (Cline, Roo Code, Kilo Code pattern). `snapshot`: tool-specific checkpoint mechanism. `none`: no checkpoints. |

### Compiler mapping

| Harness field | Claude Code | Codex CLI | Aider | Cline | Roo Code |
|---|---|---|---|---|---|
| `persistence: auto` | Default (auto-save) | Default (auto per-dir) | `--restore-chat-history` | Default | Default |
| `max-turns: 100` | `--max-turns 100` | N/A | N/A | N/A | N/A |
| `max-cost: 5.00` | `--max-budget-usd 5` | N/A | N/A | Real-time display | Per-mode guidance |
| `checkpoint: shadow-git` | Worktree (partial) | N/A | N/A | Auto-enabled | Auto-enabled |

---

## Memory

### Design Principles

Memory is the mechanism by which an agent retains knowledge across sessions. The patterns diverge significantly:

- **Auto-memory files**: Claude Code (`MEMORY.md`), Gemini CLI (`save_memory` → `GEMINI.md`)
- **Knowledge tools**: Amazon Q CLI (`knowledge` tool with semantic persistence)
- **Memory Bank convention**: Cline, Kilo Code (structured markdown files in repo)
- **Platform memory**: Copilot Memory (preview), Windsurf auto-memories, Devin Knowledge
- **Rules as memory**: Continue, Roo Code, Cursor (persistent rules serve as cross-session knowledge)

The spec standardizes the *location and format* of memory, not the *mechanism* by which tools populate it.

### Planned Schema

```yaml
memory:
  location: .harness/memory/      # Directory for memory files
  format: markdown                 # markdown | json
  auto-save: true                  # Whether the tool should auto-save learnings
  scope: project                   # project | global | both
```

### Field definitions

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `location` | string | No | `.harness/memory/` | Directory (relative to project root) where memory files are stored. |
| `format` | enum | No | `markdown` | `markdown`: memory as markdown files (Claude Code, Cline patterns). `json`: structured JSON (Amazon Q, OpenCode patterns). |
| `auto-save` | boolean | No | `true` | Whether the tool should automatically save learnings to the memory location. |
| `scope` | enum | No | `project` | `project`: memory is per-project. `global`: memory is shared across all projects. `both`: tool maintains both scopes. |

### Compiler mapping

| Harness field | Claude Code | Gemini CLI | Cline | Amazon Q CLI |
|---|---|---|---|---|
| `location` | `~/.claude/projects/*/memory/` (hardcoded, use instructions) | `GEMINI.md` | `.clinerules/memory-bank/` | N/A (tool-managed) |
| `format: markdown` | MEMORY.md index + files | Appended to GEMINI.md | Markdown files per topic | N/A |
| `auto-save: true` | Default | `save_memory` tool | Memory Bank convention | `knowledge` tool |

For tools without memory support (Aider, Codex CLI), the compiler generates a note in operational instructions directing the agent to maintain memory files manually at the specified location.

---

## Evidence Base

**Session persistence**: 14/15 tools (all except Aider which has opt-in)
- Resume by ID: Claude Code, Codex CLI, Gemini CLI, Amazon Q CLI, OpenCode
- Checkpoint-based: Cline, Roo Code, Kilo Code, Windsurf
- Persistent by design: Devin (cloud sessions never lost)

**Memory/knowledge**: 13/15 tools
- Claude Code (auto-memory MEMORY.md), Gemini CLI (save_memory), Amazon Q (knowledge tool)
- Cline + Kilo Code (Memory Bank), Windsurf (auto-memories + Knowledge Base)
- Copilot (Memory preview), Cursor (@Past Chats, Notepads), Devin (Knowledge + Playbooks)
- Continue (rules as knowledge), Roo Code (rules as knowledge)

**Cost tracking**: 11/15 tools
- Real-time: Cline, Kilo Code (Gateway)
- Session-level: Claude Code, Codex CLI, Gemini CLI, OpenCode
- Platform-metered: Copilot (premium requests), Windsurf (credits), Devin (ACUs)

Source: `research/ai-coding-tools/feature-matrix.md`
