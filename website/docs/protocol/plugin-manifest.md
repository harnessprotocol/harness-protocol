---
sidebar_position: 9
---

# Plugin Manifest

Plugin authors declare their plugin's identity and capabilities in a `plugin.json` file, validated against [`plugin.schema.json`](https://harnessprotocol.ai/schema/v1/plugin.schema.json).

## Format

```json
{
  "name": "data-lineage",
  "version": "0.3.1",
  "description": "Column-level lineage tracing through SQL, Kafka, Spark, and JDBC.",
  "license": "Apache-2.0",
  "author": {
    "name": "John Siracusa",
    "url": "https://github.com/siracusa5"
  },
  "harness-protocol": "1",
  "capabilities": {
    "skills": ["data-lineage"],
    "mcp-servers": [],
    "hooks": []
  }
}
```

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✓ | Plugin identifier. Must be unique within the source repo. |
| `version` | ✓ | Semver version string |
| `description` | ✓ | One-sentence description for import wizards and the registry |
| `harness-protocol` | ✓ | Protocol version this plugin targets (must be `"1"`) |
| `license` | — | SPDX license identifier |
| `author` | — | Author name and URL |
| `capabilities` | — | What this plugin provides |

## Capabilities

```json
"capabilities": {
  "skills": ["data-lineage"],
  "mcp-servers": ["postgres"],
  "hooks": ["session-start"]
}
```

Capabilities are informational — they help the registry surface plugins by type and help import wizards explain what a plugin does.

## Validation

Validate a plugin.json against the schema:

```bash
python3 -c "
import json, jsonschema, urllib.request
with urllib.request.urlopen('https://harnessprotocol.ai/schema/v1/plugin.schema.json') as r:
    schema = json.loads(r.read())
jsonschema.validate(json.load(open('plugin.json')), schema)
print('PASS')
"
```
