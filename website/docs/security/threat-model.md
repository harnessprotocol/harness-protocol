---
sidebar_position: 1
---

# Threat Model

The Harness Protocol threat model identifies the attack surfaces in a `harness.yaml` file and specifies how conforming implementations must defend against them.

## Trust boundaries

| Component | Trust level |
|-----------|-------------|
| Local files authored by the user | Trusted |
| Plugins from known, reviewed sources | Trusted after verification |
| Plugins from unknown or unverified sources | Untrusted until reviewed |
| Remote MCP servers (http transport) | Untrusted |
| Remote harness registries | Untrusted until integrity verified |

See [Trust Boundaries](./trust-boundaries) for the detailed model.

## Key threats

### Secret exposure

A `harness.yaml` committed to a public repo with embedded secrets. The protocol prevents this structurally:

- `sensitive: true` is the default for all env vars
- `default` values are schema-forbidden on sensitive vars
- Conforming tools must not write sensitive values to disk

### Instruction injection

A malicious harness author crafts `instructions` that subvert the user's safety rules or inject adversarial behavior. Mitigations:

- `import-mode: merge` preserves existing user instructions by default
- Users should review instructions from untrusted harnesses before import
- Conforming tools should surface imported instructions to the user

See [Instruction Injection](./instruction-injection).

### Supply chain

A plugin source (`owner/repo`) that appears legitimate but delivers malicious skills or scripts. Mitigations:

- Plugin integrity via hash verification (Exchange layer)
- Registry vetting process (Registry layer)
- Schema-layer: users should review plugin sources before installing

See [Integrity](./integrity).

### Permission escalation

A harness that requests broader permissions than its declared use case requires. Mitigations:

- Permissions are declarative intent — enforcement is the tool's responsibility
- Conforming tools should surface permission requests to the user at apply time
- Users should apply least-privilege review to harness permissions

See [Permissions](./permissions).
