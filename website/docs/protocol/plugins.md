---
sidebar_position: 3
---

# Plugins

Plugins extend the harness with skills, agents, hooks, and MCP servers from external sources.

## Declaring plugins

```yaml
plugins:
  - name: data-lineage
    source: harnessprotocol/harness-kit
    version: ">=0.3.0"
    description: Trace column-level lineage across dbt models and raw tables.

  - name: explain
    source: harnessprotocol/harness-kit
```

Each plugin entry identifies what to install (`name`), where to fetch it from (`source`), and optionally constrains the version.

## Source resolution

`source` is an `owner/repo` path resolved via GitHub by default:

```
source: harnessprotocol/harness-kit
```

resolves to `https://github.com/harnessprotocol/harness-kit`. The harness runtime fetches the plugin manifest from the repository's registered marketplace path.

## Version constraints

```yaml
version: ">=0.3.0"    # minimum version
version: "^1.0.0"     # compatible with 1.x
version: "1.2.3"      # exact version
```

Semver ranges follow the [node-semver](https://github.com/npm/node-semver#ranges) syntax. If omitted, the runtime installs the latest available version.

## Plugin manifest

Each plugin source must contain a `plugin.json` manifest validated against [`plugin.schema.json`](https://harnessprotocol.ai/schema/v1/plugin.schema.json). See [Plugin Manifest](./plugin-manifest) for the full manifest format.
