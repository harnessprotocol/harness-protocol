# Hooks (v2)

**Status:** Design Sketch (pre-HEP)
**Target:** Harness Protocol v2

---

## Purpose

Hooks let a harness profile react to events in the agent session lifecycle. Without hooks, a harness is a static configuration document: it declares what tools are available, what instructions are active, and what environment variables are required — but it has no way to run code when the harness loads, after a tool executes, or when the session ends.

Hooks fill this gap. They are the harness's way of saying: when this thing happens, run this script.

Common uses:

- **Pre-session initialization**: check that required tools are installed, verify environment configuration, run a quick smoke test against the database before allowing the agent to query it
- **Post-tool logging**: append tool call summaries to a session log, push metrics to a local service, validate that a file written by the agent passes linting before the next tool call
- **Pre-commit validation**: run a test suite before the agent writes to any files in a protected path; block the write if tests fail
- **Post-session cleanup**: archive the session log, send a summary to a webhook, clean up temporary files created during the session

Hooks are not a general-purpose scripting system. They are narrow lifecycle callbacks with explicit trigger points and explicit failure modes. The design deliberately avoids building a full plugin execution model — that is what plugins are for.

---

## Reserved Field in v1

The `hooks:` top-level key is **reserved** in the v1 schema. It is not a recognized field (and therefore not usable in v1 documents), but it is explicitly blocked from use as an `x-` extension:

- `x-hooks:` is treated as an implementation extension and will continue to be ignored by conformant implementations.
- `hooks:` as a bare top-level key is a **validation error** in v1, with a clear message indicating that the field is reserved for v2.

This reservation prevents community implementations from evolving incompatible `hooks:` schemas in the wild before the v2 HEP formalizes the format. If `hooks:` were allowed as an unrecognized field (subject to the normal "unknown fields are an error" rule), early adopters could not use it at all. By reserving it with a targeted error, we signal intent while blocking premature adoption.

```
Error: 'hooks' is a reserved field. The hooks system is specified in Harness Protocol v2.
Upgrade to a v2-compatible implementation to use hooks.
```

---

## Planned Hook Points

v2 defines eight hook trigger points, corresponding to distinct moments in the session lifecycle. The original design had four; four more were added based on evidence from a 15-tool feature matrix analysis (2026-03-27) showing that 10/15 tools implement hooks with 5–35 events each.

**Ecosystem note (June 2026).** Lifecycle hooks have continued to converge. Most major coding tools now support hooks, with shared conventions emerging: a `settings.json`-style config, regex/exact event matchers, a JSON-over-stdout protocol, blocking decisions, and `additionalContext` injection. Beyond the `command` hook type, implementations have added `http` hooks (POST to an endpoint), hooks that call an MCP server tool, prompt-evaluated and subagent-evaluated hooks, and async/non-blocking hooks that can re-wake the agent. The eight portable trigger points below remain the right cross-tool subset; the additional hook *types* are candidates for an `on` discriminator when this sketch becomes a HEP. The portability goal is unchanged: declare the lifecycle reaction once, let each implementation map it to its own hook system.

### `pre-session`

Triggered once when the harness is fully loaded and before the agent accepts its first prompt. This is the initialization hook.

Runs after:
- Schema validation completes
- `extends` inheritance is resolved
- Plugins are loaded
- MCP servers are started
- Required env variables are verified

Runs before:
- The agent accepts user input

If a `pre-session` hook fails, the session does not start. The failure message is surfaced to the user with the hook's name and exit code. The user can then fix the environment problem and re-apply.

**Intended for**: environment validation, connectivity checks, setup scripts that must succeed before the agent can be trusted to work correctly.

### `post-tool`

Triggered after each tool call completes, with access to the tool name, the call parameters, and the tool's return value.

Runs after: the tool returns a result to the agent.
Runs before: the agent processes the result and decides on its next action.

`post-tool` hooks can examine but cannot modify the tool result. They are observers, not interceptors. If a `post-tool` hook fails, the behavior depends on `on-failure`: `warn` allows the session to continue; `error` halts the session.

**Intended for**: logging, metrics, output validation (e.g., lint a file that was just written), rate-limit enforcement.

### `pre-commit`

Triggered before any write operation that modifies a file on disk. The "commit" terminology here is harness-level — it means "before persisting a change," not git commit specifically.

This hook receives the target file path. It can be used to run tests before allowing the write, check that the file is in a permitted path, or validate the file format.

If a `pre-commit` hook fails with `on-failure: error`, the write is blocked. The agent receives an error from the tool and may retry with a different approach.

**Execution order with `pre-tool`**: For write operations (Write, Edit), `pre-tool` fires first. If `pre-tool` blocks the call, `pre-commit` is never reached. If `pre-tool` passes, `pre-commit` fires with the file path. This two-stage gating allows `pre-tool` to filter by tool name and `pre-commit` to filter by file path.

**Intended for**: pre-write test suites, lint-before-write enforcement, schema validation for configuration files.

### `post-session`

Triggered when the session ends, either normally (user closes the session) or by timeout. This is the cleanup hook.

`post-session` hooks run in a best-effort mode. If the process is killed abruptly, there is no guarantee that `post-session` runs. Implementations should design post-session hooks to be idempotent — safe to run multiple times, and safe to skip.

**Intended for**: session log archiving, summary generation, temporary file cleanup.

### `pre-tool`

Triggered before each tool call executes. The hook receives the tool name and call parameters, and can block execution by exiting with a non-zero code when `on-failure: error`.

This is the complement to `post-tool`. While `post-tool` is an observer, `pre-tool` is an interceptor — it can prevent a tool call from executing. This distinction mirrors the pattern in Claude Code (`PreToolUse` / `PostToolUse`), Gemini CLI, Amazon Q CLI, Cursor, Windsurf, and Cline.

If a `pre-tool` hook fails with `on-failure: error`, the tool call is blocked. The agent receives an error and may retry with a different approach or tool.

**Intended for**: tool call validation (e.g., block dangerous commands), rate limiting, audit logging before execution, conditional tool gating.

### `notification`

Triggered when the agent produces a user-facing notification — a message that requires attention but does not involve a tool call. The hook receives the notification text.

This maps to Claude Code's `Notification` event. It is the only hook point that does not involve tool execution.

**Intended for**: forwarding notifications to external systems (Slack, email, webhooks), logging important agent decisions, alerting on specific patterns.

### `stop`

Triggered when the agent decides to stop — either because it believes the task is complete, or because it encountered an unrecoverable error. The hook receives the stop reason.

A `stop` hook with `on-failure: error` can reject the stop, causing the agent to continue working. This is useful for validation gates: "don't stop until the tests pass."

**Intended for**: completion validation (run tests before accepting done), summary generation, session metrics collection.

### `pre-compact`

Triggered before the implementation compacts (truncates/summarizes) the conversation context to fit within the model's context window. The hook receives the current token count and the target count.

This is an advanced hook point. Most users will not need it. It exists because context compaction is a lossy operation — important information can be lost. The hook provides an opportunity to extract or preserve critical context before compaction occurs.

**Intended for**: extracting key decisions or state before context loss, logging compaction events, adjusting compaction strategy.

---

### Hook point summary

| Hook point | When | Can block? | Receives |
|---|---|---|---|
| `pre-session` | Before first prompt | Yes (session won't start) | — |
| `pre-tool` | Before tool executes | Yes (tool call blocked) | Tool name, parameters (JSON on stdin) |
| `post-tool` | After tool returns | No (observe only) | Tool name, parameters, result (JSON on stdin) |
| `pre-commit` | Before file write (after `pre-tool`) | Yes (write blocked) | File path |
| `notification` | Agent notification | No (observe only) | Notification text |
| `stop` | Agent decides to stop | Yes (stop rejected) | Stop reason |
| `pre-compact` | Before context compaction | No (observe only) | Token count, target count |
| `post-session` | Session ends | No (best-effort) | — |

---

## Hook I/O Protocol

_This section describes the data format hooks receive and produce. For how to declare hooks in a harness file, see [Hook Definition Format](#hook-definition-format) below._

All hooks that receive context get a JSON object on stdin. This design was chosen based on Gemini CLI's JSON stdin/stdout protocol, which has proven effective at scale. The JSON structure varies by hook point.

### stdin

Every hook receives a JSON object with a `hook_point` field. Additional fields depend on the hook type:

**`pre-tool` and `post-tool`:**
```json
{
  "hook_point": "pre-tool",
  "tool_name": "Write",
  "parameters": {
    "file_path": "/src/main.ts",
    "content": "..."
  },
  "result": null
}
```
For `post-tool`, the `result` field contains the tool's return value (truncated to 64KB to avoid overwhelming hook processes).

**`pre-commit`:**
```json
{
  "hook_point": "pre-commit",
  "file_path": "/src/main.ts"
}
```

**`notification`:**
```json
{
  "hook_point": "notification",
  "text": "I've completed the refactoring of the auth module."
}
```

**`stop`:**
```json
{
  "hook_point": "stop",
  "reason": "task_complete",
  "message": "All tests pass. The feature is implemented."
}
```

**`pre-compact`:**
```json
{
  "hook_point": "pre-compact",
  "current_tokens": 95000,
  "target_tokens": 60000
}
```

**`pre-session` and `post-session`:** receive `{"hook_point": "pre-session"}` / `{"hook_point": "post-session"}` with no additional fields.

### stdout

Hooks may write JSON to stdout to inject context back into the agent's conversation:

```json
{
  "action": "inject",
  "message": "Warning: this file is in a protected path. Proceed with caution."
}
```

The `action` field supports:
- `inject` — Add a message to the agent's context (Cline's context-injection pattern)
- `cancel` — Block the operation with a structured reason
- (no output) — The hook ran silently; no context modification

**Precedence:** stdout action takes priority over exit code. If a hook exits 0 but writes `{"action": "cancel", "message": "..."}`, the operation is cancelled. If a hook exits non-zero but writes no stdout, the `on-failure` rule applies. If both are present and conflict, stdout wins — this allows hooks to provide structured feedback even when blocking.

This is optional. Hooks that do not write to stdout are treated as silent observers or blockers (based on exit code).

---

## Hook Definition Format

```yaml
hooks:
  pre-session:
    - name: validate-env
      run: scripts/check-env.sh
      on-failure: error

    - name: test-db-connectivity
      run: scripts/test-db.sh
      timeout: 30s
      on-failure: warn

  pre-tool:
    - name: block-dangerous-commands
      run: scripts/validate-tool-call.sh
      matcher: "Bash|Write"
      on-failure: error

  post-tool:
    - name: log-tool-call
      run: scripts/log-tool.sh
      on-failure: skip

  pre-commit:
    - name: run-tests
      run: scripts/run-tests.sh
      timeout: 120s
      on-failure: error

  stop:
    - name: verify-tests-pass
      run: scripts/verify-completion.sh
      on-failure: error

  post-session:
    - name: archive-session-log
      run: scripts/archive-log.sh
      on-failure: skip
```

### Hook entry fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | Yes | — | Identifier for this hook. Used in error messages and logs. Must be unique within a hook point. |
| `run` | string | Yes | — | Command to execute. Relative to the harness file directory. |
| `matcher` | string | No | `.*` | Glob or regex pattern matched against the tool name. Only applies to `pre-tool`, `post-tool`, and `pre-commit` hook points. Silently ignored for other hook points (`pre-session`, `notification`, `stop`, `pre-compact`, `post-session`). Mirrors Claude Code's `matcher` field. |
| `args` | array of strings | No | `[]` | Additional arguments appended to the command. |
| `env` | object | No | `{}` | Environment variables passed to the hook process. Values may reference harness env declarations via `${VAR_NAME}` syntax. |
| `timeout` | string | No | `30s` | Maximum execution time. Format: Go duration string (`30s`, `2m`, `1m30s`). Hook is killed and treated as failed if it exceeds this. |
| `on-failure` | enum | No | `warn` | What to do if the hook exits with a non-zero code. Values: `warn`, `error`, `skip`. |

### `on-failure` values

**`warn`**: The hook failure is reported to the user as a warning, but the session continues. The failure is logged.

**`error`**: The hook failure halts the current operation. For `pre-session`: the session does not start. For `pre-tool`: the tool call is blocked. For `post-tool`: the session halts. For `pre-commit`: the write is blocked. For `notification`: the session halts (treat as unexpected agent state). For `stop`: the stop is rejected and the agent continues. For `pre-compact`: the failure is logged but compaction proceeds (cannot be blocked). For `post-session`: the failure is logged but cannot halt a session that is already ending.

**`skip`**: The hook failure is silently ignored. Use only for hooks whose failure is genuinely inconsequential (e.g., a best-effort metrics push).

### Multiple hooks at one trigger point

Multiple hooks at the same trigger point are executed in order, sequentially. If an earlier hook fails with `on-failure: error`, subsequent hooks at the same point are not executed.

---

## Hook Execution Environment

Hooks run as subprocesses, not as in-process functions. This is by design: subprocesses provide a clear boundary, a predictable environment, and a measurable exit code. The implementation does not need to load arbitrary code into its own process.

### Working directory

Hook processes run with the project root as their working directory (the directory containing `harness.yaml`).

### Environment variables

Hooks receive a controlled environment. Implementations must:

1. Pass all non-sensitive env declarations from the harness `env[]` array that have values available.
2. Pass a set of harness-specific context variables:

| Variable | Description |
|---|---|
| `HARNESS_PROFILE_NAME` | The `metadata.name` of the active profile |
| `HARNESS_HOOK_POINT` | The hook trigger: `pre-session`, `pre-tool`, `post-tool`, `pre-commit`, `notification`, `stop`, `pre-compact`, `post-session` |
| `HARNESS_TOOL_NAME` | (`pre-tool`, `post-tool` only) The name of the tool that was called |
| `HARNESS_FILE_PATH` | (`pre-commit` only) The file path that is about to be written |
| `HARNESS_SESSION_ID` | A stable identifier for the current session |

Sensitive env vars (marked `sensitive: true`) are **not** passed to hooks unless the hook entry explicitly lists them by name:

```yaml
hooks:
  pre-session:
    - name: test-db-connectivity
      run: scripts/test-db.sh
      sensitive-env:
        - DB_CONNECTION_STRING
```

The `sensitive-env` field opts specific sensitive variables into the hook's environment. Implementations must display which sensitive variables are being passed to which hooks during the apply-time security review.

### Exit codes

- `0`: Success. The hook ran and completed normally.
- Non-zero: Failure. The `on-failure` rule applies.

Hooks should write human-readable error messages to stderr. The implementation captures and displays stderr on failure.

---

## Security Model

### Hooks run with harness permissions

A hook script runs with the same operating-system-level permissions as the harness session itself. The harness permission system (`permissions.tools`, `permissions.paths`, `permissions.network`) does not restrict what hook processes can do at the OS level — those constraints apply to the agent's tool calls, not to subprocess execution.

This means a `pre-session` hook can, in principle, read any file accessible to the user running the agent. The hook is trusted code, and the user must explicitly trust it.

### Mandatory display before execution

**Implementations must display all hook commands to the user at apply time, before executing any hooks.** The display must show the full resolved command (after path resolution) and the sensitive-env list. Users must explicitly confirm hook execution.

This is a hard requirement, not a suggestion. The threat model for hooks is identical to the threat model for arbitrary shell execution: a malicious harness could include hook scripts that exfiltrate data, modify system files, or establish persistence. User confirmation at apply time is the primary defense.

The confirmation prompt must display:

```
This harness declares lifecycle hooks that will execute scripts on your machine:

  pre-session:
    validate-env       → scripts/check-env.sh
                         (no sensitive env)
    test-db-connectivity → scripts/test-db.sh
                         sensitive env: DB_CONNECTION_STRING
                         timeout: 30s

  pre-tool:
    block-dangerous-commands → scripts/validate-tool-call.sh
                               matcher: Bash|Write

  pre-commit:
    run-tests          → scripts/run-tests.sh
                         timeout: 120s

  stop:
    verify-tests-pass  → scripts/verify-completion.sh

Allow hooks? [y/N]
```

### Hooks from inherited profiles

When a child profile inherits hooks from a parent via `extends`, the inherited hooks must be included in the confirmation display with their source indicated:

```
  pre-session (from my-org/base-harness@^1.0.0):
    validate-org-tools → scripts/check-org-tools.sh

  pre-session (local):
    validate-env       → scripts/check-env.sh
```

The user confirms the full set, not just the child profile's hooks. Inherited hooks cannot be silently injected.

### `import-mode` for hooks

Hook inheritance follows the same `import-mode` semantics as instructions:

- `merge` (default): child hooks are added to parent hooks at each trigger point. Both run.
- `replace`: child hook declarations replace parent hook declarations at trigger points the child declares.
- `skip`: the child does not declare hooks; parent hooks pass through.

---

## v1 Manual Workarounds

While `hooks:` is reserved in v1 and not yet available, some harness implementations provide their own hook mechanisms. Harness profiles can use the `instructions.operational` block to guide users through manual configuration.

### Claude Code hooks (settings.json)

Claude Code supports a hooks system in `.claude/settings.json`. A harness profile's operational instructions can document the manual setup:

```markdown
## Lifecycle Hooks (Manual Setup Required)

This harness uses lifecycle hooks for test enforcement. Configure them in
`.claude/settings.json`:

\`\`\`json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/run-tests.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/log-tool.sh"
          }
        ]
      }
    ]
  }
}
\`\`\`

When the v2 Exchange layer ships, this manual setup will be replaced by the
`hooks:` field in this harness file.
```

The Claude Code hooks format uses a `matcher` field (a glob or regex pattern matched against the tool name) and a `hooks` array of commands to execute.

**Mapping from the planned v2 format to Claude Code's current format:**

| v2 hook point | Claude Code hooks equivalent |
|---|---|
| `pre-session` | No direct equivalent. Use a `PreToolUse` matcher `".*"` with a one-shot state check, or configure manually outside the harness. |
| `pre-tool` | `PreToolUse` with matcher pattern |
| `post-tool` | `PostToolUse` with matcher pattern |
| `pre-commit` | `PreToolUse` with matcher `"Write\|Edit"` |
| `notification` | `Notification` event |
| `stop` | `Stop` event |
| `pre-compact` | `PreCompact` event |
| `post-session` | No direct equivalent in Claude Code hooks. |

### Other harness tools

As of March 2026, hooks are far more prevalent than when this sketch was first drafted. The following tools now support lifecycle hooks:

| Tool | Hook events | Format | Notes |
|---|---|---|---|
| Claude Code | 25+ events | `.claude/settings.json` | Most mature; 4 handler types (command, HTTP, prompt, agent) |
| Codex CLI | Experimental | `hooks.json` | Agent-turn notifications |
| Gemini CLI | 11 events | `.gemini/hooks/` | JSON stdin/stdout; full agent loop coverage |
| Amazon Q CLI | 5 hooks | settings | AgentSpawn, UserPromptSubmit, Pre/PostToolUse, Stop |
| OpenCode | 35+ events | Plugin system | Most events via npm plugin hooks |
| Cursor | 18+ events | `.cursor/hooks/` | Command + prompt handler types |
| Windsurf | 12 events | `.windsurf/hooks.json` | Pre/post blocking |
| Cline | 8 hooks | Settings | Cancel/inject semantics |

Tools without hooks: Aider, Continue, Roo Code, Kilo Code, JetBrains (AI Assistant/Junie), Devin.

Until tools add hook support natively, harnesses targeting those tools should note in `instructions.operational` that lifecycle automation requires manual setup and reference the tool's own mechanisms (e.g., VS Code tasks for pre-save validation).

### Plugin-based workaround

For harness authors who need hook-like behavior today, plugins offer a complete solution. A plugin can implement `pre-session` initialization, `post-tool` logging, or pre-write validation as tool calls that the harness instructions direct the agent to invoke at appropriate moments:

```yaml
# Instructions that simulate a pre-session hook
instructions:
  operational: |
    ## Session Initialization
    At the start of every session, before doing any other work, run:
    `bash scripts/check-env.sh`
    If it fails, stop and report the error. Do not proceed until the
    environment check passes.
```

This is brittle — it relies on the agent following the instruction rather than a hard implementation-enforced callback. The v2 `hooks:` system replaces this pattern with a guaranteed execution model.

---

## Open Questions for HEP

1. **Hook script location security**: Should hooks be restricted to the project directory? A hook that runs `/usr/local/bin/my-tool` is running arbitrary system code without any harness-relative path validation. Should `run:` paths be required to be relative to the harness directory, or should absolute paths be permitted?

   *Evidence from research (2026-03-27):* Claude Code and Gemini CLI both allow absolute paths. Codex CLI restricts hooks to the project directory. The majority pattern is to allow absolute paths but display them prominently in the confirmation prompt.

2. **Hook output streaming**: Should hook stdout/stderr be streamed to the user during execution, or buffered and shown only on failure? Streaming is more transparent but produces noise for low-latency post-tool hooks.

   *Evidence:* Claude Code buffers and shows on failure. Gemini CLI streams. Recommendation: buffer by default, with a `stream: true` field per hook entry for hooks that benefit from real-time output (e.g., long-running test suites).

3. **Conditional hooks**: Should hooks support an `if:` condition (e.g., `if: "env.DB_ENV == 'production'"`)? This would allow hooks that only run in specific contexts without requiring separate profiles.

   *Evidence:* No tool implements conditional hooks. The `matcher` field (from Claude Code) provides tool-scoped conditionality. Full `if:` conditions add complexity for minimal gain. Recommendation: defer — use `matcher` for tool-scoped conditions, and separate profiles for environment-scoped conditions.

4. **`post-tool` parameter access**: What format does the hook receive tool call parameters in? Environment variables (limited by env var syntax constraints), JSON on stdin, or a temp file? Tool response values can be large — passing them to hooks requires a defined serialization format.

   *Resolved:* JSON on stdin, based on Gemini CLI's proven JSON stdin/stdout protocol. See the Hook I/O Protocol section above. Results truncated to 64KB.

5. **Inheritance and hook ordering**: When multiple parents each declare hooks at the same trigger point, what is the execution order? Is it the same as the `extends` resolution order (left to right, child last)?

   *Recommendation:* Yes, follow `extends` resolution order. Parent hooks run first, child hooks run last. This matches the principle that child profiles refine parent behavior.

6. **Sensitive env disclosure**: The current design requires authors to explicitly opt in sensitive env vars per hook (`sensitive-env:`). Should the default instead be that all harness env vars (including sensitive) are available to hooks, with an explicit exclusion mechanism? The current design is safer but more verbose for scripts that legitimately need database credentials.

   *Evidence:* Claude Code passes all env vars to hooks. Gemini CLI restricts sensitive vars. Recommendation: keep the current explicit opt-in design — it is safer and the verbosity cost is low (one line per sensitive var per hook).
