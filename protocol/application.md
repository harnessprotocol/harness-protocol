# Application Semantics

This document specifies what "applying" a harness means: the pipeline from a validated `harness.yaml` to an active agent session. It defines the **effective configuration** — the normative output contract that all conformant implementations MUST produce — and the error categories, variable substitution rules, and atomicity guarantees that govern the process.

---

## Overview

A harness document (`harness.yaml`) is a declaration of intent. It describes plugins, MCP servers, environment requirements, instructions, and permissions. **Application** is the process of transforming that declaration into a live agent session where all declared components are operational.

Application is distinct from validation. A harness can validate successfully without a runtime environment — schema checks and cross-field constraints do not require environment variables to be set or MCP servers to be reachable. Application requires a runtime environment and produces side effects (starting processes, establishing connections, configuring permissions).

This document covers the abstract application semantics. It does not mandate a specific implementation strategy (compilation to config files vs. runtime configuration). Both strategies produce the same normative output: the effective configuration. For the non-normative compilation approach, see [Compiler Targets](../extensions/compiler-targets.md).

---

## The Effective Configuration

The **effective configuration** is the fully resolved result of applying a harness document. It is produced after all `extends` chains are resolved, all merge rules are applied, and all variable substitutions are performed. The effective configuration is the normative output contract — it is what an implementation has produced when it says "this harness has been applied."

A conformant effective configuration MUST contain:

| Field | Type | Description |
|-------|------|-------------|
| `metadata` | object (optional) | The child's metadata, if present. Parent metadata is not inherited. |
| `plugins` | array | Unioned plugin set after inheritance resolution. |
| `skills` | array | Unioned skill set after inheritance resolution (disabled skills excluded). |
| `mcp-servers` | map | Unioned MCP server declarations after inheritance resolution, with all `${VAR_NAME}` references substituted. |
| `env` | array | Unioned environment declarations after inheritance resolution. |
| `instructions` | object | Merged/replaced/skipped instruction content per `import-mode`. |
| `permissions` | object | Permission boundaries after inheritance resolution (intersection for allow, union for deny/ask/paths/network). |
| `policy` | object (optional) | The accumulated governance ceiling, present if any `policy` section appears in the resolution set. Enforced against the configuration; a violation prevents application. |

The effective configuration is a snapshot: it represents the harness's complete state at application time. Changes to parent harnesses, environment variables, or plugin sources after application do not retroactively alter an active session's effective configuration.

---

## Application Pipeline

The application pipeline has seven steps. Each step either succeeds and passes its result to the next step, or fails and halts the pipeline. There is no partial application.

### Step 1: Parse

The implementation reads `harness.yaml` and parses it as YAML.

- The file MUST contain exactly one YAML document.
- Malformed YAML (syntax errors, multiple documents) is a **fatal error**.
- The parser MUST NOT silently coerce types in ways that change semantics. In particular, the `version` field MUST be preserved as a string — `version: 1` (integer) is not equivalent to `version: "1"` (string). The JSON Schema enforces `"type": "string"`, so any conformant validator will reject the integer `1`. Implementations SHOULD additionally provide a helpful error message suggesting `version: "1"` (string). Silently coercing the integer to a string is NOT permitted.

### Step 2: Validate

The parsed document is validated in two passes:

**JSON Schema validation.** The document is validated against `harness.schema.json`. For `kind: profile` documents, all required fields are enforced. For `kind: fragment` documents, required-field constraints are relaxed. Schema validation failure is a **fatal error**.

**Semantic validation.** Cross-field constraints that JSON Schema cannot express:

- Every `${VAR_NAME}` reference in `mcp-servers` MUST have a corresponding entry in the top-level `env` array.
- `plugins[].name` values MUST be unique within the array.
- `env[].name` values MUST be unique within the array.

Semantic validation failure is a **fatal error**.

Validation does NOT require a runtime environment. A harness can be validated in CI, in an editor, or offline without any environment variables set or MCP servers reachable. This is by design — validation checks the document's internal consistency, not its runtime viability.

### Step 3: Resolve Sources

Resolve all external references in the validated document:

1. **Resolve `extends` chain** — Fetch and validate each parent harness, recursively. Detect circular dependencies (fatal). Enforce depth limits (see [Inheritance](./inheritance.md)). Local paths (`./`, `../`) are resolved relative to the directory containing the consuming harness file.

2. **Resolve plugin sources** — Fetch plugin archives from each `plugins[].source` at the declared version. Verify `integrity.sha256` if present (mismatch is fatal).

For the complete source resolution algorithm, see [Source Resolution](./source-resolution.md).

### Step 4: Merge

Apply section-specific merge rules to produce the pre-substitution effective configuration:

- `plugins`: Union by name; child/later wins on conflict.
- `skills`: Union by name; child/later wins on conflict.
- `mcp-servers`: Union by server name; child/later wins (full object replacement).
- `env`: Union by name; child/later wins.
- `instructions`: Governed by child's `import-mode`.
- `permissions.tools.allow`: Intersection (most restrictive wins).
- `permissions.tools.deny`: Union (any denial propagates).
- `permissions.tools.ask`: Union (any ask propagates).
- `permissions.paths`: Union (additive).
- `permissions.network`: Union (additive).
- `policy`: Accumulated as a ceiling, not merged like other sections — allowlists intersect, denylists union, permission ceilings intersect, `require-integrity` is monotonic. See Step 5.
- `metadata`: Child's metadata only; parent metadata is discarded.

For the complete merge rule specification, see [Inheritance](./inheritance.md).

### Step 5: Enforce Policy

If any `policy` section is present in the resolution set, the accumulated policy (computed per the `policy` merge rule above) is enforced against the candidate effective configuration produced by Step 4. This step is pure validation — it produces no side effects.

The following are **fatal errors** (the harness is not applied):

- An `mcp-servers`, `plugins`, or `skills` entry whose `source`/host is not permitted by the relevant `policy` allowlist, or is matched by a denylist.
- A `permissions.tools.allow` or `permissions.network.allowed-hosts` entry that exceeds the corresponding policy ceiling. Policy `permissions.tools.deny` is unioned into the effective deny set.
- A plugin, skill, or **stdio** MCP server lacking a verifiable integrity hash when `policy.require-integrity` is `true`. Remote MCP servers (`streamable-http`/`sse`/`ws`) have no fetched package and are exempt — they are verified via TLS and registry/identity, not a hash.

A policy violation MUST be surfaced as a clear error. Implementations MUST NOT silently strip violating entries and apply a degraded configuration. A document with no `policy` in its resolution set skips this step entirely (the v1 behavior before this step existed). See [Profile Schema: policy](./profile-schema.md#policy) and [Inheritance](./inheritance.md).

### Step 6: Substitute Variables

Resolve `${VAR_NAME}` references from the runtime environment.

**Substitution scope** — Variables are substituted in the following `mcp-servers` fields only:

| Transport | Substituted fields |
|-----------|-------------------|
| stdio | `command`, `args` elements, `env` values |
| streamable-http/http/sse/ws | `url`, `headers` values |

**NOT substituted:** `env` entry keys, server names (map keys), plugin names, `metadata` fields, `instructions` content, `permissions` patterns. These are structural identifiers, not runtime values.

**Resolution order for each `${VAR_NAME}` reference:**

1. Look up `VAR_NAME` in the runtime environment.
2. If not found, check the `env[]` declaration for `VAR_NAME`:
   - If `required: true` → **fatal error**. The harness MUST NOT be applied.
   - If a `default` value is declared → use the default.
   - Otherwise → the variable is absent. The implementation MAY substitute an empty string or leave the reference unresolved, depending on context.
3. The implementation MUST NOT log, display, or store the resolved values of variables declared `sensitive: true`.

### Step 7: Apply

With the effective configuration fully resolved, policy-checked, and all variables substituted:

1. **Start MCP servers** — Launch or connect to each declared MCP server using its transport configuration. Startup order is implementation-defined. All servers MUST be operational before the session is considered active.
   This includes both profile-level MCP servers declared in `mcp-servers` and plugin-bundled MCP servers declared in `plugin.json` → `mcp`. Plugin-bundled servers are started when their plugin is loaded.
2. **Install instructions** — Apply instruction content per `import-mode`. For `import-mode: replace`, the implementation MUST require explicit user confirmation before proceeding.
3. **Enforce permissions** — Install permission rules at the tool boundary for the session.

If any MCP server fails to start, the implementation MUST stop all servers that were successfully started and report the failure. The session is not active.

---

## Error Categories

The application pipeline produces errors at various stages. Errors are classified into three categories that govern implementation behavior.

### Fatal

A fatal error means the harness MUST NOT be applied. The implementation MUST halt the pipeline and surface the error to the user. No partial application is permitted.

| Error | Stage |
|-------|-------|
| Malformed YAML | Parse |
| Schema validation failure | Validate |
| Semantic validation failure (undeclared `${VAR}`, duplicate names) | Validate |
| Circular `extends` chain | Resolve |
| Inheritance depth limit exceeded | Resolve |
| Source repository not found | Resolve |
| Entry point missing (`plugin.json` or `harness.yaml`) | Resolve |
| Integrity mismatch (`sha256` verification failure) | Resolve |
| Policy violation (forbidden source, exceeded ceiling, missing integrity under `require-integrity`) | Enforce Policy |
| Missing required environment variable | Substitute |
| MCP server start failure | Apply |

### Warning

A warning means the harness MAY be applied, but the implementation MUST surface the condition to the user. The user SHOULD have the opportunity to abort.

| Warning | Stage |
|---------|-------|
| No matching version tag (falling back to default branch HEAD) | Resolve |
| Non-enforceable permission (implementation lacks support for a declared constraint) | Apply |
| Deprecated field (field is recognized but scheduled for removal) | Validate |
| `import-mode: replace` (discards parent instructions; requires user confirmation) | Apply |

### Informational

An informational note means the harness was applied normally. Implementations MAY log these for debugging or auditing purposes.

| Note | Stage |
|------|-------|
| Cache hit during source resolution | Resolve |
| Optional environment variable absent (using default or skipped) | Substitute |

---

## Atomicity

The application pipeline follows a **validate-then-apply** model:

1. **All validation MUST complete before any side effects.** Steps 1–5 (Parse, Validate, Resolve Sources, Merge, Enforce Policy) MUST succeed before Step 6 (Substitute) and Step 7 (Apply) begin. This means an implementation MUST NOT start MCP servers while still resolving extends chains or checking policy.

2. **No partial application on validation failure.** If any step in the pipeline produces a fatal error, the implementation MUST NOT apply any part of the harness. The user's environment MUST remain unchanged.

3. **Post-validation failure cleanup.** If a fatal error occurs during Step 7 (e.g., an MCP server fails to start after others have already started), the implementation MUST stop all successfully started servers. Cleanup is best-effort — the implementation SHOULD attempt to stop all started servers but is not required to guarantee transactional rollback of all side effects.

4. **No transactional rollback.** The protocol does not require implementations to support full transactional rollback (e.g., undoing file writes or reverting environment changes). The validate-then-apply model is designed to minimize the need for rollback by catching most failures before side effects begin.

---

## Variable Substitution Timing

Variable substitution happens at two distinct points, with different semantics:

**At validation time (Step 2):** The implementation checks that every `${VAR_NAME}` reference in `mcp-servers` has a corresponding entry in the `env[]` array. This is a structural check — it verifies that the variable is *declared*, not that it has a *value*. A harness can validate without a runtime environment.

**At application time (Step 6):** The implementation resolves `${VAR_NAME}` references against the actual runtime environment. A harness that validated successfully can still fail to apply if required variables are unset in the runtime environment.

This two-phase design enables:

- **CI schema checks** — Validate harness files in CI without requiring secret values.
- **Editor support** — Provide validation feedback without a running agent session.
- **Fail-fast on structural errors** — Catch missing declarations before attempting to start servers.

---

## Compilation vs. Runtime Application

The effective configuration is the normative output of the application pipeline. How an implementation produces it is not specified — two strategies are common:

**Compilation.** The implementation generates tool-specific configuration files (e.g., `.mcp.json`, `CLAUDE.md`, `settings.json` for Claude Code). The generated files are the effective configuration materialized as files. This is a non-normative strategy; see [Compiler Targets](../extensions/compiler-targets.md) for one example.

**Runtime application.** The implementation configures a live agent session in memory, starting MCP servers and applying permissions directly. No intermediate files are generated.

Both strategies MUST produce the same effective configuration for the same input harness and environment. This document specifies the effective configuration contract; it does not mandate either strategy.

---

## Conformance Requirements Summary

| Requirement | Level | Section |
|-------------|-------|---------|
| Parse exactly one YAML document | MUST | Parse |
| Preserve `version` as string, not integer | MUST | Parse |
| Validate against `harness.schema.json` | MUST | Validate |
| Enforce cross-field semantic constraints | MUST | Validate |
| Detect circular `extends` chains | MUST | Resolve |
| Verify `integrity.sha256` when declared | MUST | Resolve |
| Enforce `policy` ceiling as fatal validation; never silently strip | MUST | Enforce Policy |
| Complete all validation before side effects | MUST | Atomicity |
| No partial application on validation failure | MUST | Atomicity |
| Substitute `${VAR_NAME}` only in specified `mcp-servers` fields | MUST | Substitute |
| Fail on missing required environment variable | MUST | Substitute |
| Never log sensitive variable values | MUST | Substitute |
| Require user confirmation for `import-mode: replace` | MUST | Apply |
| All MCP servers operational before session is active | MUST | Apply |
| Stop all started servers on post-validation failure | MUST | Apply |
| Cache resolved sources | RECOMMENDED | Resolve |
| Provide force-refresh mechanism for cached sources | MUST | Resolve |
| Enforce maximum inheritance depth | MUST | Resolve |
