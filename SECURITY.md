# Security Policy — Harness Protocol Specification

This document covers the security policy for the **Harness Protocol specification** — the format definition, JSON Schema, and normative behavioral rules for conforming implementations.

If you are looking for:
- **harness-kit implementation bugs** → [github.com/harnessprotocol/harness-kit/security/advisories](https://github.com/harnessprotocol/harness-kit/security/advisories)
- **MCP server vulnerabilities** → contact the MCP server operator
- **Plugin vulnerabilities** → contact the plugin author

---

## What This Document Covers

The Harness Protocol spec defines:
- The `harness.yaml` format and JSON Schema
- Security-relevant field constraints (e.g., `sensitive: true` + `default` is forbidden)
- Required behaviors for conforming implementations (confirmation gates, provenance markers, `${VAR}` validation)
- Trust boundaries between the spec, implementations, profiles, and remote content

A vulnerability in this context is a flaw in the **specification itself** — a design decision or schema constraint that makes the security model unsound in ways that affect all conforming implementations.

---

## Trust Assumptions When Importing Profiles

Before importing any `harness.yaml` profile, users should understand the following:

**What importing a profile can do:**
- Install plugins that execute code within your harness
- Launch local subprocesses via `stdio` MCP server configurations
- Establish network connections to remote MCP server endpoints
- Access environment variables from your shell, including secrets
- Inject instructions into your AI's operational context

**What validation guarantees:**
- Schema validation confirms the profile's *structure* is valid — required fields are present, forbidden combinations (like `sensitive: true` with a `default`) are absent, and field formats are correct.
- Schema validation does **not** verify the *content* of instructions, the safety of declared MCP endpoints, the integrity of referenced plugins (unless `integrity.sha256` is present), or the authenticity of the declared author.

**What you must do yourself:**
- Read the full profile before confirming import
- Verify that the profile comes from the source you expect (check the actual repository URL, not just the `metadata.author` field)
- Review all `env[]` declarations — these are the variables the harness will access from your environment
- Review all `mcp-servers` entries — especially network-transport servers, which establish outbound connections
- Inspect `plugins[].source` values for typosquatting (e.g., `org-name` vs `0rg-name`)
- Treat profiles without `integrity.sha256` on their plugin entries as unverified

**The general rule:** Importing a profile from an unknown author with unverified content is equivalent to running an unknown script from the internet. Your implementation will show you what the profile does before it applies — read it.

---

## What IS a Vulnerability in This Spec

Report an issue as a spec vulnerability if it fits one of these categories:

### Spec Design Flaws

A design decision in the specification that makes the security model unsound as written:

- A case where the threat model claims a mitigation exists but the spec text does not actually require it
- An `import-mode` or instruction-handling behavior that allows profile instructions to displace user safety rules without the user's knowledge, as a result of ambiguous or incomplete spec language
- A trust boundary that the spec describes but provides no enforcement mechanism for, in cases where enforcement is feasible
- A case where the spec allows a profile to grant permissions beyond what the harness has configured (the least-privilege invariant for the permissions block)

### JSON Schema Constraints That Can Be Bypassed

The JSON Schema is normative. A bypass is a vulnerability:

- A `sensitive: true` + `default` combination that the schema's `if/then/else` conditional fails to reject in some validator implementation due to ambiguous schema construction
- A field combination that is semantically forbidden by the spec but not rejected by the schema, where the gap is in the schema's design rather than a validator bug
- An `additionalProperties` gap that allows undocumented fields to carry semantics that affect security behavior in ways the user cannot see

### Instruction Injection Vectors Not Addressed by the Spec

- A profile field or combination of fields that allows instruction content to be injected into the AI's context without receiving a provenance marker
- A mechanism by which profile instructions can reach the AI in a way that bypasses the meta-instruction injection requirement
- An `extends[]` inheritance path that delivers instruction content to the AI without the full chain being presented to the user

### Undeclared Variable Access

- A case where the spec's `${VAR}` declaration requirement can be bypassed — i.e., a profile can cause the implementation to pass an environment variable to an MCP server process without that variable appearing in the profile's `env[]` declarations

---

## What Is NOT a Vulnerability in This Spec

The following are outside the scope of the spec's security model. They may be real security problems worth addressing, but not here.

### Plugin Authors Writing Malicious Code

Plugin authors are semi-trusted. The Harness Protocol provides `integrity.sha256` as a content-pinning mechanism and requires implementations to warn when it is absent. Beyond that, plugin code is the plugin author's responsibility. A plugin that steals credentials is a malicious plugin — report it to the plugin author's repository and, if applicable, the registry operator.

Do not report this here: "Plugin X does Y bad thing."

### MCP Servers Behaving Unexpectedly

Remote MCP servers (`http`, `sse`, `ws`) are explicitly classified as untrusted by the spec. The spec requires implementations to surface server URLs to users during import review and treats server responses as untrusted content. What a specific MCP server does with the tool calls it receives is entirely outside the spec's authority. A server that logs your queries, returns prompt injection payloads, or probes your network is behaving badly — but that is an issue with that server's operator, not with the Harness Protocol spec.

Do not report this here: "The MCP server at X is doing Y."

### Implementation Bugs in harness-kit or Other Implementations

If harness-kit fails to enforce a confirmation gate, incorrectly validates a hash, or silently applies a profile — those are harness-kit bugs. Report them to [github.com/harnessprotocol/harness-kit/security/advisories](https://github.com/harnessprotocol/harness-kit/security/advisories).

The spec defines the required behavior. Whether a specific implementation correctly implements that behavior is the implementation's concern.

Do not report this here: "harness-kit doesn't show the confirmation dialog."

### User Decisions After Full Disclosure

If a user reviews a profile's full content, reads all the warnings an implementation displays, and then chooses to import a profile that does something harmful — that is a user decision, not a spec vulnerability. The spec's security model is based on informed consent, not prohibition. Users can choose to import profiles with unsigned plugins, `replace`-mode instructions, and broad network permissions — as long as the implementation disclosed all of it.

---

## Responsibility Framework

Security in the Harness Protocol ecosystem is distributed:

**Spec authors** are responsible for:
- Defining a sound security model in the specification
- Writing JSON Schema constraints that correctly enforce the model
- Maintaining this security policy and threat model documentation
- Issuing spec errata when vulnerabilities are found in the design

**Implementation developers** are responsible for:
- Faithfully implementing all spec-required security behaviors
- Presenting complete, accurate information to users at import time
- Validating profiles against the schema before processing
- Enforcing behavioral rules the schema cannot express (`${VAR}` cross-field validation, `replace` confirmation gate, meta-instruction injection)
- Maintaining their own security policies for implementation-specific bugs

**Profile authors** are responsible for:
- Providing accurate `metadata` and `env[]` descriptions
- Including `integrity.sha256` on all plugin declarations in profiles they distribute publicly
- Not including credentials or sensitive defaults in profile files
- Not designing profiles with the intent to harm users
- Pinning parent profile versions in `extends[]` to protect users from inheritance poisoning

**Users** are responsible for:
- Reading profiles before confirming import
- Verifying the source of profiles, especially those claiming official status
- Making informed decisions when implementations display warnings about unverified plugins or network connections
- Reporting suspicious profiles to the distribution channel where they found them

---

## Responsible Disclosure

If you believe you have found a vulnerability in the Harness Protocol specification, please report it privately before public disclosure.

**How to report:**

Use GitHub Security Advisories at:
[github.com/harnessprotocol/harness-protocol/security/advisories](https://github.com/harnessprotocol/harness-protocol/security/advisories)

Do not open a public GitHub issue for security vulnerabilities. Public disclosure before a fix is available puts all users of conforming implementations at risk.

**What to include in your report:**
- A description of the vulnerability and why it is a spec-level issue
- A concrete attack scenario demonstrating the impact
- The specific section(s) of the spec or schema that are flawed
- If possible, a suggested fix or mitigation

**Response timeline:**
- **Acknowledgment:** Within 5 business days of receipt
- **Initial triage:** Within 10 business days — we will assess severity and whether it is a spec-level issue or an implementation issue
- **Fix timeline:** Depends on severity. Critical issues (active exploitation risk) will be prioritized. We will communicate an expected timeline in our triage response.
- **CVE coordination:** For vulnerabilities that warrant a CVE, we will coordinate assignment through the GitHub Advisory Database. We will notify you before public disclosure.

**Coordinated disclosure:** We ask reporters to allow reasonable time for a fix to be developed and for implementation maintainers to be notified before public disclosure. We will work with you to agree on a disclosure timeline.

---

## Recognition

Reporters who identify valid spec vulnerabilities will be credited in the specification's CHANGELOG at the time of public disclosure, unless they prefer to remain anonymous. Please indicate your preference in your report.

We do not currently offer a bug bounty for spec vulnerabilities. This may change as the protocol matures.
