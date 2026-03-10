---
sidebar_position: 4
---

# Secrets Management

The Harness Protocol is designed so that secrets never appear in `harness.yaml` files. This is enforced structurally by the schema.

## The rule

`sensitive: true` (the default for all env vars) forbids `default` values:

```yaml
# Schema will reject this:
env:
  - name: API_KEY
    sensitive: true
    default: my-secret-key   # ← INVALID

# Correct — no default, user provides the value at apply time:
env:
  - name: API_KEY
    sensitive: true
    description: API key for the analytics service.
```

## Providing secrets at apply time

Conforming implementations must prompt users for sensitive values at apply time and store them outside the harness file — typically in:

- Shell profile (`~/.zshrc`, `~/.bashrc`)
- A `.env` file excluded from version control
- A system secret manager (macOS Keychain, 1Password, etc.)

## Non-sensitive defaults

For genuinely non-secret configuration, opt out explicitly:

```yaml
env:
  - name: LOG_LEVEL
    sensitive: false   # not a secret
    default: info      # allowed
```

## What never goes in harness.yaml

- API keys, tokens, passwords
- Database credentials
- Private keys or certificates
- Personal access tokens

If you find yourself wanting to put a secret in `harness.yaml`, use an `env` entry with `sensitive: true` and provide the value through your secret manager instead.
