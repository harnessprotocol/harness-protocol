---
sidebar_position: 5
---

# Instruction Injection

The `instructions` section of a harness file is injected into the AI agent's context at apply time. A malicious harness author could craft instructions that subvert the user's safety rules, override existing constraints, or manipulate the agent's behavior.

## Risk surface

Instructions that could be harmful:

- Override user's existing CLAUDE.md safety rules ("ignore all previous instructions")
- Grant permissions not declared in `permissions`
- Shape agent behavior toward goals the user didn't intend
- Exfiltrate sensitive information through agent outputs

## Mitigations in the protocol

**`import-mode: merge` is the default** — user's existing instructions are always preserved and take precedence over imported content. Imported instructions are appended, not prepended.

**Users must review instructions before import** — conforming tools should display the full `instructions` content before applying it and require explicit confirmation.

**Source trust** — instructions from unverified sources (Zone 3 per the [Trust Boundaries](./trust-boundaries) model) should require additional confirmation.

## For conforming implementations

1. Always display imported `instructions` to the user before applying
2. Apply `merge` mode by default regardless of the harness's declared `import-mode`, unless the user explicitly opts into `replace`
3. Warn clearly when a harness requests `import-mode: replace`
4. Surface any instruction content that resembles jailbreak patterns (e.g. "ignore previous instructions", "you are now", "disregard your guidelines")
