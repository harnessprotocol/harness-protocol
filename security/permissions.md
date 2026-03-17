# Harness Protocol v1 — Permissions

**Status:** Draft
**Version:** Harness Protocol v1

---

## What the `permissions` Section Is and Is Not

The `permissions` section of a `harness.yaml` profile is a declarative statement of intent. It documents what tool access, filesystem paths, and network hosts the harness expects to use. It is self-authored by the profile: the profile says what it needs, not what it has been granted.

This distinction matters. The `permissions` section is **not an enforcement boundary**. The enforcement boundary is the implementation's own permission model — Claude Code's allow/deny configuration, the harness runtime's access controls, or whatever the host environment provides. A profile that declares `allow: ["*"]` in `permissions.tools` does not gain access to all tools. It self-declares that it wants all tools. Whether it gets them is up to the implementation.

Implementations enforce their own permission models. The spec defines the format for declarative permissions and the semantics of how they compose across inheritance chains. It does not define how implementations must enforce them — different implementations have different enforcement mechanisms, and the spec cannot and should not prescribe them all.

---

## Why Declarative Permissions Still Matter

If declarations are not enforced by the spec, why include them? Three reasons:

**Self-documentation.** A profile's `permissions` block tells users what access the profile expects to need before they apply it. A user reviewing a profile can see at a glance that it needs write access to `src/` and network access to `*.github.com`, without reading the full profile content. This is the same reason interfaces document their contracts even when the runtime does not formally verify them — the documentation is for humans, not just machines.

**Auditing.** Tools, registries, and CI pipelines can inspect `permissions` declarations and flag profiles that request unusual or broad access. A registry that flags any profile declaring `allow: ["*"]` without an explanation can surface suspicious profiles before users install them. This is a soft control, not a hard one — but soft controls at scale provide real value.

**Defense-in-depth for enforcing implementations.** Implementations that do enforce a permission model have a machine-readable spec to work from. An implementation that gates tool use on the profile's declared `allow` list has a well-defined, testable surface. The declarative spec is the contract that makes enforcement implementable consistently across the ecosystem.

---

## The `tools` Section

```yaml
permissions:
  tools:
    allow:
      - Read
      - Glob
      - Grep
      - Write
      - Edit
      - Bash
      - "mcp__github__*"
    deny:
      - "mcp__*__delete_*"
      - "mcp__*__drop_*"
    ask:
      - Bash
      - Write
```

The `tools` section has three lists:

**`allow`** — Tools the harness declares it needs. Entries are exact tool names or glob patterns using `*` as a wildcard. A profile should list only what it genuinely uses. An allow list that is narrower than what the implementation permits is fine — the profile is self-limiting. A profile cannot grant itself access beyond what the implementation has configured for the session.

**`deny`** — Tools the harness explicitly does not use. Deny entries take precedence over allow entries when both match. A tool that matches a deny pattern is disallowed even if it also matches an allow pattern. This allows profiles to broadly allow a category and then carve out exceptions:

```yaml
allow:
  - "mcp__github__*"       # allow all GitHub MCP tools
deny:
  - "mcp__github__delete_*"  # except deletion operations
```

**`ask`** — Tools that should prompt for user confirmation before each use, even when the tool is in the allow list. Useful for high-impact tools (`Bash`, `Write`) where the user wants to retain control over individual invocations.

**Glob pattern syntax.** The `*` wildcard matches any sequence of characters within a single path segment. MCP tool names follow the pattern `mcp__SERVER__TOOL`, so:
- `mcp__github__*` matches all tools on the `github` server
- `mcp__*__delete_*` matches any tool whose name begins with `delete_` on any MCP server
- `*` alone matches everything (see Red Flags below)

---

## The `paths` Section

```yaml
permissions:
  paths:
    writable:
      - src/
      - tests/
      - migrations/
      - "**/*.generated.ts"
    readonly:
      - config/
      - "*.lock"
      - ".env.example"
```

**`writable`** — Paths (relative to project root) the harness may write to. A path listed as writable implicitly permits reading as well. Glob patterns are supported.

**`readonly`** — Paths the harness reads but should not modify. Declaring a path as readonly is a self-imposed constraint: the profile asserts it will not write there. Enforcing implementations can use this to prevent accidental writes to configuration files or lock files.

Path entries are relative to the project root unless they begin with `/`. Absolute paths are discouraged in shared profiles — they are unlikely to be correct on another user's system.

---

## The `network` Section

```yaml
permissions:
  network:
    allowed-hosts:
      - "*.github.com"
      - "api.openai.com"
      - "registry.harnessprotocol.io"
```

**`allowed-hosts`** — Hostnames or hostname glob patterns identifying the network hosts this harness may contact. A profile that fetches from GitHub, calls an API, or connects to a remote MCP server should list those hosts here.

Hostname patterns use `*` as a wildcard for subdomains: `*.github.com` matches `api.github.com`, `raw.githubusercontent.com`, and `uploads.github.com`, but not `github.com` itself (the wildcard does not match an empty segment). To allow both the apex and all subdomains, list both: `["github.com", "*.github.com"]`.

If `allowed-hosts` is absent, network permission behavior is implementation-defined. Implementations are encouraged to treat the absence of an `allowed-hosts` declaration as "unrestricted" for compatibility with profiles that predate the `permissions` section, but MAY warn users when they apply profiles with no declared network boundary.

---

## Inheritance

Permissions compose across the `extends[]` inheritance chain. The composition rules differ by list type and reflect the security principle that restrictions should propagate from parents to children:

### `tools.allow` — Intersection (Most Restrictive Wins)

A tool is allowed only if every ancestor that declares a `tools.allow` list includes it (directly or via glob pattern). If a parent allows `["Read", "Write", "Bash"]` and a child allows `["Read", "Grep", "Bash"]`, the effective allow list is `["Read", "Bash"]` — only what both declared.

This prevents child profiles from granting themselves access to tools that their parents did not allow. A child cannot escape an ancestor's restrictions by simply re-declaring `allow: ["*"]`.

```
Parent: allow: [Read, Write, Bash]
Child:  allow: [Read, Grep, Bash]
Result: allow: [Read, Bash]         # intersection
```

### `tools.deny` — Union (Any Ancestor's Denial Propagates)

A tool is denied if any ancestor denies it. If a parent denies `mcp__*__delete_*`, a child cannot reinstate those tools by omitting the denial. Once denied in the ancestry chain, always denied.

```
Parent: deny: ["mcp__*__delete_*"]
Child:  deny: []
Result: deny: ["mcp__*__delete_*"]  # parent's denial propagates
```

### `tools.ask` — Union (Any Ancestor's Ask Propagates)

If any ancestor requires confirmation for a tool, confirmation is required regardless of what the child declares.

### `paths` — Union (Additive Only)

Path lists are unioned across the inheritance chain. A child can add writable or readonly paths but cannot remove paths that a parent has restricted. This means path restrictions accumulate — a parent that marks `config/` as readonly cannot have that restriction removed by a child.

### `network.allowed-hosts` — Union (Additive)

Allowed-hosts lists are unioned. A child can add new allowed hosts but cannot remove hosts that a parent declared. Children inherit all parent network allowances.

---

## The Least-Privilege Principle

Profiles should declare only the permissions they genuinely need. This is not just good hygiene — it makes profiles easier to audit and increases user confidence during import review.

Guidelines for profile authors:

- List specific tools rather than categories. Prefer `["Read", "Grep", "Glob"]` over `["*"]` if the profile only reads files.
- List specific paths for writes. If a profile only writes to `src/` and `tests/`, declare exactly that rather than leaving `writable` empty (which some implementations treat as unrestricted).
- List specific hosts for network access. If a profile only calls `api.github.com`, say so rather than `"*.github.com"` or omitting `allowed-hosts` entirely.
- Use `ask` for high-impact tools even when they are in the allow list. `Bash` and `Write` benefit from per-invocation confirmation in most workflows.
- Explain unusual permissions. If a profile needs broad permissions for a legitimate reason, document why in `metadata.description` or in the profile's README. A profile that needs `Bash` with no `ask` entry and no explanation is harder to trust than one that explains why autonomous shell execution is required.

---

## Red Flags

Certain permission declarations are inherently suspicious and warrant heightened scrutiny during profile review.

**`allow: ["*"]`** — Requests access to every tool the implementation exposes, including all MCP tools. Very few legitimate profiles need unrestricted tool access. A profile that declares this without a deny list and without explanation should be treated with significant skepticism. The most common legitimate use is a general-purpose profile that genuinely does not know in advance what tools will be needed — but even then, a `deny` list of destructive operations is expected.

**`allow: ["*"]` with `deny: []`** — Explicitly requests all tools and explicitly clears any denial list. This combination is the broadest possible permission declaration. There is no legitimate reason for a well-scoped profile to do this. Treat profiles with this combination as suspicious.

**`writable: ["/"]` or `writable: ["**"]`** — Claims write access to the entire filesystem. No profile needs this. Profiles claiming filesystem-wide write access are red flags.

**`network.allowed-hosts: ["*"]`** — Claims unrestricted outbound network access to any host. Combined with a network-transport MCP server, this could route sensitive context to arbitrary endpoints. Profiles claiming unrestricted network access without specific host declarations should be scrutinized.

These are not schema-level prohibitions — the spec does not forbid these declarations. Registries and implementations MAY flag them, and users should treat them as signals during manual review.
