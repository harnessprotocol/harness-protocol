# Models (v2)

**Status:** Design Sketch (pre-HEP)
**Target:** Harness Protocol v2

---

## Purpose

Every AI coding tool surveyed (15/15 in the March 2026 feature matrix) implements model selection. The Harness Protocol v1 has no way to express model preferences. This is the single largest gap between the spec and the tool landscape.

The `models` section lets a harness profile declare which models should be used for which roles, what reasoning effort to apply, and what provider to prefer — without locking the harness to a specific tool or provider.

---

## Reserved Field in v1

The `models:` top-level key is **reserved** in the v1 schema, following the same reservation pattern as `hooks:`:

```
Error: 'models' is a reserved field. The models system is specified in Harness Protocol v2.
```

---

## Design Principles

### Provider-agnostic model references

Model references use the `provider/model-id` pattern, which has emerged as the de facto standard across OpenCode (75+ providers), Continue (40+), Cline (30+), and Aider (19+). Examples:

- `anthropic/claude-sonnet-4-5-20250514`
- `openai/gpt-4o`
- `google/gemini-2.0-flash`
- `ollama/llama3`

When a tool is locked to a single provider (Claude Code → Anthropic, Gemini CLI → Google), the `provider/` prefix is optional — the tool ignores it and uses the model ID directly.

### Role-based model assignment

Different tasks benefit from different models. The research identified three convergent role patterns:

1. **Aider's three-role model**: main (primary), weak (fast/cheap for simple tasks), editor (optimized for code edits)
2. **Continue's six-role model**: chat, edit, apply, autocomplete, embed, rerank
3. **Roo Code / Kilo Code per-mode model**: each custom mode (code, architect, review) can have a different model

The spec defines a core set of roles that most tools can map to, plus an extension mechanism for tool-specific roles.

### Reasoning/thinking configuration

10/15 tools expose thinking or reasoning controls. The patterns:

- **Effort levels**: Claude Code (4 levels + ultrathink), Codex CLI (5 levels), Aider (per-provider), Gemini CLI (per-alias thinkingConfig)
- **Token budgets**: Aider (--thinking-tokens), Gemini CLI (budget field)
- **Binary**: Cursor and Windsurf (model-dependent, no explicit control)

---

## Planned Schema

```yaml
models:
  # Role-based model assignment
  main: anthropic/claude-sonnet-4-5-20250514
  weak: anthropic/claude-haiku-4-5-20251001
  editor: anthropic/claude-sonnet-4-5-20250514

  # Reasoning configuration
  reasoning:
    effort: medium    # low | medium | high | max
    budget: 16384     # Maximum thinking tokens (0 = disabled)

  # Optional: embeddings model (for tools that support semantic search)
  embed: openai/text-embedding-3-small

  # Optional: fallback chain (Gemini CLI pattern)
  fallback:
    - anthropic/claude-sonnet-4-5-20250514
    - openai/gpt-4o
    - google/gemini-2.0-flash
```

### Field definitions

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `main` | string | No | Tool default | Primary model for chat and agent tasks. Format: `provider/model-id` or bare `model-id`. |
| `weak` | string | No | Same as `main` | Fast/cheap model for simple tasks (commit messages, summaries, simple edits). Aider calls this "weak model." |
| `editor` | string | No | Same as `main` | Model optimized for code editing. May use a different edit format (e.g., Aider's editor model uses whole-file format). |
| `embed` | string | No | Tool default | Embeddings model for semantic search and indexing. Only used by tools with codebase indexing. |
| `reasoning.effort` | enum | No | `medium` | Reasoning effort level: `low`, `medium`, `high`, `max`. Maps to tool-specific levels (Claude Code's 4 levels, Codex CLI's 5, etc.). |
| `reasoning.budget` | integer | No | 0 (unlimited) | Maximum thinking tokens. 0 means use the tool's default. Maps to Aider's `--thinking-tokens`, Gemini CLI's `thinkingConfig.budget`. |
| `fallback` | array of strings | No | `[]` | Ordered list of fallback models. If the primary model is unavailable, try the next. Gemini CLI pattern. |

### Role mapping across tools

| Harness role | Claude Code | Codex CLI | Aider | Gemini CLI | OpenCode | Cursor | Copilot | Continue | Cline | Roo Code |
|---|---|---|---|---|---|---|---|---|---|---|
| `main` | /model | model | --model | model | model | Model picker | Model picker | chat | API config | Per-mode model |
| `weak` | (subagent model) | (not configurable) | --weak-model | (not separate) | small_model | (not separate) | (auto-select) | edit | (not separate) | (not separate) |
| `editor` | (not separate) | (not configurable) | --editor-model | (not separate) | (not separate) | (not separate) | (not separate) | apply | (not separate) | (not separate) |
| `embed` | (not applicable) | (not applicable) | (not applicable) | (not applicable) | (not applicable) | Built-in | Built-in | embed | (not applicable) | Qdrant config |
| `reasoning.effort` | --thinking-budget | reasoning_effort | --reasoning-effort | thinkingConfig.level | variants | (model toggle) | (not exposed) | completionOptions | Plan/Act mode | Per-profile |

---

## Compiler Target Mapping

### Tools that use the models section directly

For BYOM tools (Aider, OpenCode, Continue, Cline, Roo Code, Kilo Code), the compiler can generate native model configuration:

**Aider** (`.aider.conf.yml`):
```yaml
model: anthropic/claude-sonnet-4-5-20250514
weak-model: anthropic/claude-haiku-4-5-20251001
editor-model: anthropic/claude-sonnet-4-5-20250514
```

**OpenCode** (`opencode.json`):
```json
{
  "model": "anthropic/claude-sonnet-4-5-20250514",
  "small_model": "anthropic/claude-haiku-4-5-20251001"
}
```

### Tools that ignore the models section

For provider-locked tools (Claude Code, Gemini CLI, Amazon Q CLI), the compiler maps the model reference to the tool's native aliases:

**Claude Code**: `anthropic/claude-sonnet-4-5-20250514` → `sonnet` alias in `/model` command guidance. The compiler cannot programmatically set the model, but can include it in the operational instructions.

### Degraded compilation

When the harness declares a model from a provider that the target tool does not support, the compiler emits a warning:

```
Warning: models.main 'anthropic/claude-sonnet-4-5-20250514' is not available in target 'gemini-cli'.
  Gemini CLI only supports Gemini models. The model preference has been noted in
  the operational instructions but cannot be machine-enforced.
```

---

## Relationship to x- Extensions

The `models` section deliberately covers only the most common patterns. Tool-specific model configuration (e.g., Aider's `--map-tokens`, Gemini CLI's model chains, Continue's 6 model roles, Roo Code's per-mode model assignment) should use `x-` extension fields:

```yaml
models:
  main: anthropic/claude-sonnet-4-5-20250514
  reasoning:
    effort: high
  x-aider:
    map-tokens: 2048
    cache-prompts: true
  x-continue:
    autocomplete: codestral/codestral-latest
    rerank: voyage/rerank-2
```

---

## Evidence Base

This design is informed by the March 2026 feature matrix analysis of 15 AI coding tools:

- **MCP support**: 14/15 (validates multi-tool approach)
- **BYOM (fully provider-agnostic)**: 6/15 — Aider, OpenCode, Continue, Cline, Roo Code, Kilo Code
- **Multi-model (some BYOK)**: 4/15 — Cursor, Copilot, Windsurf, JetBrains
- **Provider-locked**: 4/15 — Claude Code, Gemini CLI, Amazon Q CLI, Devin
- **Reasoning/effort controls**: 10/15 tools expose some form of this

Source: `research/ai-coding-tools/feature-matrix.md`
