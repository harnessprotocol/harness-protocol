# Compiler Targets (v2)

**Status:** Design Sketch (pre-HEP)
**Target:** Harness Protocol v2 (spec mapping documented here; compiler is a harness-kit feature)
**Last updated:** 2026-03-09

---

## Purpose

The Harness Protocol defines a single source format — `harness.yaml` — for configuration that currently exists in many tool-specific files: `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `.cursor/rules/` for Cursor, `.windsurfrules` for Windsurf. A developer who uses multiple AI coding tools today maintains separate, diverging configuration files for each tool.

The harness compiler solves this. Given one `harness.yaml`, it generates the idiomatic configuration files for each supported target tool. The mapping is deterministic and documented here so that any conformant implementation can produce consistent output.

### Scope note

The compiler is a **harness-kit feature**, not a protocol mechanism. The protocol defines the `harness.yaml` schema and semantics; what a tool does with those semantics at apply time is the implementation's concern. The reason this mapping is documented in the spec repository (rather than only in harness-kit's documentation) is to establish a shared reference for other implementations. An independent harness manager that wants to compile to Claude Code and Cursor should produce the same output that harness-kit produces. Consistency across implementations benefits the ecosystem.

---

## Target Mapping

### Instructions

Instructions are the most significant compiler output. The three instruction slots — `operational`, `behavioral`, `identity` — map to different files in each target tool.

| Harness slot | Claude Code | GitHub Copilot | Cursor | Windsurf |
|---|---|---|---|---|
| `instructions.operational` | `CLAUDE.md` | `.github/copilot-instructions.md` | `.cursor/rules/harness.mdc` | `.windsurfrules` |
| `instructions.behavioral` | `AGENT.md` | `.github/instructions/behavioral.instructions.md` | `.cursor/rules/behavioral.mdc` | (merged into `.windsurfrules`) |
| `instructions.identity` | `SOUL.md` | (not supported — omit) | (not supported — omit) | (not supported — omit) |

**Behavioral slot merging (Windsurf)**: Windsurf does not have a separate behavioral configuration file. The compiler merges behavioral content into `.windsurfrules` after operational content, with a section header:

```
## Behavioral Preferences
[behavioral content]
```

**Identity slot (Claude Code only)**: The `identity` slot maps to `SOUL.md`, which is a Claude Code convention for a persistent self-model file. Other tools do not support this concept. The compiler omits `SOUL.md` generation for non-Claude-Code targets. When `identity: null` is declared, no `SOUL.md` is written even for Claude Code.

**Cursor rules format**: Cursor's `.mdc` format (Markdown with metadata frontmatter) requires a frontmatter block. The compiler adds standard frontmatter when generating `.cursor/rules/harness.mdc`:

```markdown
---
description: Harness operational instructions
globs: **/*
alwaysApply: true
---

[operational content]
```

### MCP Servers

MCP server declarations compile to tool-specific JSON configuration files.

| Harness field | Claude Code | GitHub Copilot / VS Code | Cursor | Windsurf |
|---|---|---|---|---|
| `mcp-servers` | `.mcp.json` | `.vscode/mcp.json` | `.cursor/mcp.json` | `.windsurf/mcp.json` |

All four target paths use the same JSON structure (the MCP JSON format), but at different file paths. The compiler translates the `harness.yaml` MCP server map to the target's JSON format:

```json
{
  "mcpServers": {
    "postgres": {
      "type": "stdio",
      "command": "uvx",
      "args": ["mcp-server-postgres", "--connection-string", "${DB_CONNECTION_STRING}"]
    }
  }
}
```

Note: the harness YAML key `transport` maps to the MCP JSON key `type`. The compiler handles this renaming. YAML keys that are harness-specific and have no MCP JSON equivalent are omitted from the output.

### Permissions

Permissions are the most implementation-specific section. AI coding tools have diverging mechanisms for controlling tool access.

| Harness field | Claude Code | GitHub Copilot | Cursor | Windsurf |
|---|---|---|---|---|
| `permissions.tools.allow` | `settings.json` `allowedTools` | GitHub organization policy | `.cursor/rules` permission annotations | `.windsurfrules` annotations |
| `permissions.tools.deny` | `settings.json` `denyListedTools` | GitHub organization policy | `.cursor/rules` permission annotations | `.windsurfrules` annotations |
| `permissions.tools.ask` | `settings.json` (requires approval hook) | — | — | — |
| `permissions.paths` | `settings.json` `allowedDirectories` | — | — | — |
| `permissions.network` | — | — | — | — |

**Claude Code `settings.json`** is the most complete target for permissions. The compiler generates a `.claude/settings.json` section:

```json
{
  "permissions": {
    "allow": ["Read", "Glob", "Grep", "Write", "Edit"],
    "deny": ["mcp__postgres__drop_*"],
    "additionalDirectories": ["sql/", "migrations/"]
  }
}
```

**Copilot, Cursor, Windsurf**: These tools do not have a standardized JSON permissions format equivalent to Claude Code's `settings.json`. For these targets, the compiler generates instructions-based permission guidance — human-readable text injected into the operational instructions file that describes the intended permissions:

```markdown
## Tool Permissions

This harness specifies the following tool permissions:
- **Allowed**: Read, Glob, Grep, Write, Edit, Bash
- **Denied**: Any tool matching `mcp__*__drop_*` or `mcp__*__delete_*`

Please configure your tool's permission settings to match these constraints.
```

This is a degraded compilation — it communicates intent but relies on the user to configure the tool rather than the tool enforcing the permissions automatically. The compiler warns when targeting a tool where permissions cannot be machine-enforced:

```
Warning: permissions.tools.deny is not machine-enforceable for target 'cursor'.
  Denied tools: mcp__*__drop_*
  Instructions have been updated to describe the intended permissions,
  but manual tool configuration is required.
```

### Plugins

Plugins have no standard cross-tool representation. The compiler does not generate plugin configuration for non-harness-kit targets. When a harness declares plugins, the compiler generates a human-readable plugin list in the operational instructions for non-Claude-Code targets, noting that harness-kit plugin support is required for automatic installation.

For Claude Code (which uses harness-kit as its reference implementation), plugins compile to their harness-kit configuration format.

---

## Section Markers

The compiler uses markers to identify generated sections within target files. This allows the compiler to update generated sections on re-compilation without overwriting user customizations outside those sections.

### Marker format

```
<!-- BEGIN harness:{profile-name}:{slot} -->
...generated content...
<!-- END harness:{profile-name}:{slot} -->
```

Where `{profile-name}` is the harness `metadata.name` and `{slot}` identifies which part of the harness generated this content.

**Example `CLAUDE.md` after compilation:**

```markdown
# Project Setup

This is my manually written project intro. The harness compiler leaves this section alone.

<!-- BEGIN harness:data-engineer:operational -->
## Commands
- Build: `dbt run`
- Test: `dbt test`

## Architecture
Entry: `dbt_project.yml`
Models: `models/`

## Gotchas
- Always run `dbt compile` after adding a new model.
<!-- END harness:data-engineer:operational -->

My personal notes that I keep below the generated section.
```

On re-compilation, only the content between the `BEGIN` and `END` markers is updated. Content outside the markers is untouched.

### Marker rules

1. Markers use HTML comment syntax. They are invisible in rendered Markdown but visible in raw file inspection.

2. The profile name in the marker is the harness `metadata.name`. If multiple profiles contribute to a file (e.g., through inheritance), each has its own marker block.

3. If a marker is missing from a file (e.g., the user deleted it), the compiler appends a new marker block at the end of the file on the next compilation. It does not attempt to guess where the old block was.

4. If a file contains markers from a profile that is no longer referenced (because the user switched profiles), those orphaned marker blocks are left in place unless the user runs `harness compile --clean`, which removes unreferenced marker blocks.

---

## Import-Mode Implementation

The `instructions.import-mode` field controls how the compiler handles existing content when generating instruction files.

### `merge` (default)

The compiler appends generated content within markers after any existing content outside the markers. If this is the first compilation (no markers exist), the compiler appends the generated block at the end of the file, creating the file if it does not exist.

```
[existing content, preserved]
<!-- BEGIN harness:data-engineer:operational -->
[generated content, updated on re-compilation]
<!-- END harness:data-engineer:operational -->
```

### `replace`

The compiler replaces the entire file with generated content. Content outside the markers is discarded.

Because `replace` destroys existing content, the compiler requires explicit confirmation:

```
Warning: import-mode 'replace' will overwrite CLAUDE.md.
  Existing content (42 lines) will be replaced with generated content.
  Your manual customizations will be lost.

Proceed? [y/N]
```

After a `replace` compilation, the generated content is still wrapped in markers (to support future re-compilation):

```
<!-- BEGIN harness:data-engineer:operational -->
[generated content]
<!-- END harness:data-engineer:operational -->
```

On the next `replace` re-compilation, the markers are found, the block is updated, and no content exists outside the markers (so there is nothing to destroy). The confirmation prompt is skipped on re-compilation of a file that only contains harness marker blocks.

### `skip`

The compiler does not generate or modify the instruction file for this slot. If the file already exists, it is left untouched. If it does not exist, it is not created.

`skip` is useful for fragments that are purely additive (adding MCP servers or plugins) and intentionally leave instruction management to the consuming profile.

---

## Compiler CLI

The compiler is implemented as a subcommand of the harness-kit CLI:

```sh
harness compile [--target <target>] [--dry-run] [--clean]
```

**Options:**

`--target <target>` — One of `claude-code`, `copilot`, `cursor`, `windsurf`, or `all`. Default: `all`. When `all`, the compiler generates output for all supported targets.

`--dry-run` — Print what would be written without writing any files. Useful for reviewing compiler output before committing to it.

`--clean` — Remove orphaned marker blocks (from profiles no longer referenced) in addition to updating current profile content.

**Examples:**

```sh
# Compile for all targets
harness compile

# Compile only for Claude Code
harness compile --target claude-code

# Preview what would be generated without writing files
harness compile --dry-run

# Clean up orphaned markers and recompile
harness compile --clean
```

### Compilation report

The compiler prints a summary of files written:

```
Compiled harness: data-engineer (v1.2.0)
Target: claude-code

  Written:  CLAUDE.md                  (operational, merge — 48 lines added)
  Written:  AGENT.md                   (behavioral, merge — 12 lines added)
  Skipped:  SOUL.md                    (identity: null)
  Written:  .mcp.json                  (mcp-servers — 2 servers)
  Written:  .claude/settings.json      (permissions — 6 allowed, 2 denied)

  Warnings:
    permissions.network is not enforced via settings.json in this target version.
    Add allowed-hosts manually to .claude/settings.json if needed.
```

---

## Adding New Targets

The compiler's target table is expected to expand as new AI coding tools adopt the Harness Protocol or as harness-kit adds support for additional tools. The process for adding a target:

1. Open an issue in the harness-kit repository describing the target and the file format mapping.
2. Implement the compilation mapping in harness-kit (the target is a harness-kit concern, not a spec concern — no HEP required).
3. Document the mapping table in this file (editorial PR to the spec repository, no HEP required since this document is non-normative).
4. If the new target requires new schema fields to support correctly (e.g., a new section in `harness.yaml` to hold tool-specific configuration), that addition requires a HEP.

The spec's role is to document the canonical mapping. harness-kit's role is to implement it. Other implementations may use this document as the reference for their own compilation logic.

---

## Relationship to the Protocol

Compilation is an apply-time concept. The `harness.yaml` schema does not encode compilation targets — a harness file does not say "generate CLAUDE.md." The compiler is a layer on top of the schema that makes the harness file actionable for specific tools.

The protocol's responsibility ends at: "here is a validated, merged harness document." The compiler's responsibility begins at: "take this document and produce the right files for this tool." This separation means:

- A harness file is readable and useful without the compiler (an AI tool that natively reads `harness.yaml` needs no compilation step)
- The compiler's behavior can change (new target added, output format updated) without changing the protocol
- Multiple compilers can produce different output from the same harness, as long as they correctly apply the mapping table

The spec documents the mapping to establish a shared reference, not to make compilation a spec-normative behavior.
