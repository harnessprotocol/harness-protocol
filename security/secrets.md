# Harness Protocol v1 — Secrets and Sensitive Variables

**Status:** Candidate
**Version:** Harness Protocol v1

---

## The Secrets Problem in Harness Configuration

A harness configuration is, by design, a portable artifact. Profile authors write `harness.yaml` files that other users can import, share through registries, commit to repositories, and embed in onboarding scripts. Portability is the feature.

Secrets are the opposite of portable. An API key embedded in a committed file is a leaked credential. This creates a direct tension: harnesses need to know which environment variables to request from the user's environment, but the values of those variables must never appear in the harness file itself.

The Harness Protocol resolves this tension with a declaration model: `env[]` entries describe which variables a harness needs and why, but the values are never stored in the profile. The profile is safe to commit and share. The values live exclusively in the user's environment.

---

## How the Harness Protocol Addresses Secrets

### `sensitive: true` Is the Default

The `sensitive` field on each `env[]` entry defaults to `true`. A variable is assumed to contain sensitive data unless the profile author explicitly declares otherwise:

```yaml
env:
  - name: GITHUB_TOKEN
    description: "GitHub personal access token with repo scope"
    required: true
    # sensitive: true is the default — no need to write it explicitly

  - name: DEFAULT_SCHEMA
    description: "Default PostgreSQL schema for queries"
    sensitive: false     # explicit opt-out: this is safe to log and display
    default: "public"
```

This default means that a profile author who forgets to think about sensitivity is conservative, not permissive. Forgetting to mark a variable as sensitive is not possible — the only mistake is unnecessarily marking a non-sensitive variable as sensitive, which has no harmful consequence.

### `sensitive: true` + `default` Is Schema-Forbidden

A `default` value on a sensitive variable would embed a secret into the profile file. The JSON Schema enforces this at validation time using an `if/then/else` conditional: when `sensitive` is not explicitly `false`, the `default` property is forbidden. A profile that declares both `sensitive: true` (or omits `sensitive`, which defaults to `true`) and a `default` value will fail schema validation. Implementations MUST reject such profiles before processing.

This is not a lint warning. It is a hard validation failure. The profile is invalid.

```yaml
env:
  # INVALID — fails schema validation:
  - name: API_TOKEN
    description: "Service API token"
    sensitive: true
    default: "sk-placeholder"     # FORBIDDEN: sensitive + default

  # VALID — default allowed because sensitive is explicitly false:
  - name: LOG_LEVEL
    description: "Log verbosity (debug, info, warn, error)"
    sensitive: false
    default: "info"
```

### Implementations MUST NOT Surface Sensitive Values

Implementations have obligations beyond schema validation. Even when a sensitive variable's value is available (because the user's environment has it set), the implementation must not expose it:

- **No logging.** Sensitive variable values must not appear in any log output, including debug logs, install traces, and error messages.
- **No display.** Implementations must not print or render sensitive variable values during import, apply, or status commands — not even masked forms like `sk-***` that confirm the value's length or prefix.
- **No file writes.** Implementations must not write sensitive variable values to any file — not to lock files, snapshots, resolved configuration dumps, or diagnostics bundles.

These requirements apply to sensitive values obtained from any source: the user's shell environment, a secrets manager integration, or interactive prompting. Once a sensitive value is in memory, it stays in memory. It does not flow outward.

### The `env[]` Declaration Is for Documentation Only

An `env[]` entry declares what variables a harness uses and why. It is not a configuration store. The value of a declared variable is never embedded in the profile, read from the profile, or set by the profile.

At runtime, the implementation reads variable values from the user's environment (or a user-configured secrets manager) and passes them to the components that need them — most commonly as environment variables to `stdio` MCP server processes or as values in `headers` for network transport servers. The profile participates only in describing what is needed, not in providing it.

---

## What `env[]` Is Not

`env[]` is not a secrets store. It is not a `.env` file. It is not a way to configure values for variables. It is a declaration that these variables exist, what they are for, and whether their values are sensitive. That is all.

Profile authors sometimes mistake the `env[]` array for a mechanism to set values. It is not. Values are never embedded in `harness.yaml`. If you need to provide a default value, the variable must be non-sensitive (`sensitive: false`), and even then the default is a fallback for when the environment does not set the variable — it is not a credential.

---

## Secret Injection Patterns

At import or install time, implementations should surface the full set of sensitive variable declarations so the user can ensure their environment is prepared before applying the harness.

**Pre-apply checklist presentation.** Before applying a profile, implementations SHOULD display a summary of all required sensitive variables that are not currently set in the user's environment. The display shows the variable name and description — never any value. Example:

```
The following required secrets are not set in your environment:

  GITHUB_TOKEN   GitHub personal access token with repo scope
  ANTHROPIC_KEY  Anthropic API key for model calls

Set these in your environment before proceeding, or configure a secrets
manager integration. See the documentation for setup instructions.
```

**Interactive prompting.** Implementations MAY offer interactive prompting as a convenience, allowing users to enter sensitive values at install time. If an implementation does this, it MUST:
- Not echo the value as the user types
- Not store the entered value in any file
- Pass the value directly to the target component (e.g., inject it into a shell session or write it to a secrets manager)

**Secrets manager integration.** Implementations SHOULD support integration with external secrets managers (e.g., 1Password CLI, macOS Keychain, AWS Secrets Manager). When a secrets manager is configured, the implementation resolves sensitive variable values from the manager rather than the raw environment. This keeps secrets out of shell history, dotfiles, and environment inspection tools.

---

## Common Mistake: Hardcoded Values in `mcp-servers.env`

The `mcp-servers[*].env` field (for `stdio` servers) passes environment variables to the launched process. Values in this map may reference `env[]` declarations using `${VAR_NAME}` syntax. This is the correct pattern:

```yaml
# CORRECT: references a declared env[] variable
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres]
    env:
      PGPASSWORD: "${DB_PASSWORD}"

env:
  - name: DB_PASSWORD
    description: "PostgreSQL password"
    sensitive: true
```

A profile author might instead write the value directly:

```yaml
# WRONG: hardcoded credential in the profile
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres]
    env:
      PGPASSWORD: "hunter2"      # literal secret in the profile file
```

This is wrong for two reasons. First, the credential is now in the profile file, which is portable and likely committed to version control. The credential is effectively public. Second, the credential bypasses the `env[]` declaration system — the user reviewing the profile's `env[]` list will see no mention of this access, and the implementation cannot warn about it.

**How to detect this pattern.** Implementations SHOULD scan all `mcp-servers[*].env` values (and `mcp-servers[*].headers` values for network transports) and warn when a value matches patterns associated with credentials: long random-looking strings, strings starting with common API key prefixes (`sk-`, `ghp_`, `AKIA`, `xoxb-`), or strings that contain characters not typical of non-secret configuration values. This is heuristic and not foolproof, but it catches the most common cases.

Implementations MUST enforce the structural rule separately: every `${VAR}` reference in `mcp-servers` must correspond to a declared `env[]` entry. A value that is a plain string (not a `${VAR}` reference) cannot be validated structurally — it is either a non-sensitive literal (acceptable) or a hardcoded secret (a mistake the author must fix).

---

## The `when` Field

The `when` field on an `env[]` entry is a human-readable description of when a variable is needed:

```yaml
env:
  - name: GITHUB_TOKEN
    description: "GitHub personal access token with repo scope"
    sensitive: true
    required: false
    when: "When accessing private GitHub repositories"

  - name: OPENAI_API_KEY
    description: "OpenAI API key for GPT-4 access"
    sensitive: true
    required: false
    when: "When the sql-explain plugin's model is set to 'openai'"
```

Its primary purpose is to help users understand which secrets they actually need to configure for their specific use of the harness. Implementations display it when prompting for or listing variables.

Implementations MAY also evaluate `when` as a condition expression — for example, `"plugins contains 'data-lineage'"` — to suppress prompting when the condition is false. When an implementation does evaluate it as a condition, a false result relaxes the `required` constraint for that variable. When an implementation does not evaluate it programmatically, it is displayed as informational text. Either behavior is conformant in v1.

`when` is particularly useful when a harness has optional capabilities that require different credentials. A user who does not use a particular feature can skip setting up its credential. `when` makes the conditional nature of the requirement explicit.

`when` does not affect schema validation or the `sensitive: true` + `default` prohibition. A variable with a `when` value and `sensitive: true` still cannot have a `default`.
