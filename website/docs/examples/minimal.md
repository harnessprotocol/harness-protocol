---
sidebar_position: 1
---

# Minimal Profile

The smallest valid Harness Protocol v1 profile — passes schema validation with only `version` and `metadata.name`.

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
metadata:
  name: minimal
  description: The simplest valid Harness Protocol v1 profile.
```

Everything else (`plugins`, `mcp-servers`, `env`, `instructions`, `permissions`, `extends`) is optional.

Use the minimal profile as a starting point, then add sections as your needs grow.
