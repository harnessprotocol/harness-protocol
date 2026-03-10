---
sidebar_position: 1
slug: /intro
---

# What is Harness Protocol?

The Harness Protocol is an open specification for portable AI coding harnesses — a vendor-neutral `harness.yaml` format that captures the complete operational context for an AI coding agent: plugins, MCP servers, environment requirements, behavioral instructions, and permissions.

It is to AI coding harnesses what the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) is to tool communication.

## Why a spec?

AI coding tools are proliferating. Each one has its own configuration format. Setups built for Claude Code don't transfer to Copilot. Team harnesses can't be shared across tools. Integrations have to be rebuilt for every platform.

The Harness Protocol solves this at the format layer — a single, validated `harness.yaml` that any conforming tool can read, apply, and share.

## Protocol layers

| Layer | Description | Status |
|-------|-------------|--------|
| **Schema** | The `harness.yaml` format, JSON Schema validation, security model, plugin manifest | v1 — current |
| **Exchange** | Harness-to-harness sharing: publish, fetch, and compose across tools and teams | v2 — planned |
| **Registry** | Hosted discovery: search, publish, version resolution, integrity verification | v2/v3 — planned |

Layers are intentionally decoupled. A tool can implement Schema-layer validation today without any dependency on exchange or registry infrastructure.

## Quick start

The minimal valid profile requires only `version` and `metadata.name`:

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
metadata:
  name: my-harness
  description: My personal harness configuration.
```

Validate it with:

```bash
# With harness-kit installed in Claude Code:
/harness-validate

# Or directly with jsonschema:
pip install jsonschema pyyaml
python3 -c "
import json, yaml, jsonschema
schema = json.load(open('schema/draft/harness.schema.json'))
jsonschema.validate(yaml.safe_load(open('harness.yaml')), schema)
print('PASS')
"
```

## Reference implementation

[**harness-kit**](https://harnesskit.ai) is the reference implementation — a plugin marketplace for Claude Code that uses `harness.yaml` for setup sharing. The `/harness-export`, `/harness-import`, and `/harness-validate` skills all produce and consume Harness Protocol v1 files.

## JSON Schema

The machine-readable source of truth:

- [`harness.schema.json`](https://harnessprotocol.ai/schema/v1/harness.schema.json) — profile validation
- [`plugin.schema.json`](https://harnessprotocol.ai/schema/v1/plugin.schema.json) — plugin manifest validation

Add the `$schema` line to your `harness.yaml` to get editor autocomplete and inline validation in VS Code.
