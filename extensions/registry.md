# Registry — superseded by HEP-8

**Status:** Promoted. This pre-HEP design sketch has been promoted into the normative specification.

The Registry layer is now specified by:

- **[HEP-8: Registry layer](../heps/hep-0008-registry-layer.md)** — the proposal, rationale, and v2/v3 boundary.
- **[protocol/registry.md](../protocol/registry.md)** — the normative specification (indexing, registration, discovery API, namespace, transparency log, trust model, content policy).
- **[schema/draft/registry.schema.json](../schema/draft/registry.schema.json)** — JSON Schema for the registry document shapes (transparency-log entries, registration request/response; `$id` `https://harnessprotocol.io/schema/v2/registry.schema.json`).
- **[security/registry.md](../security/registry.md)** — the Registry threat model.
- **[examples/registry/](../examples/registry/)** — worked registration and transparency-log documents.

This file is retained only as a pointer. Do not edit it as a design document; propose changes to the Registry layer through the HEP process (see [CONTRIBUTING.md](../CONTRIBUTING.md)).
