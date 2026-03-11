# Registry (v2/v3) — Hosted Discovery

**Status:** Design Sketch (pre-HEP)
**Target:** Harness Protocol v2 (basic indexing) / v3 (curation, signing)
**Last updated:** 2026-03-09

---

## Purpose

The v1 protocol resolves fragments and profiles by `owner/repo` — a GitHub-native address that works without any additional infrastructure. This is intentional: the first version of the format should not require a registry to be useful.

The Registry layer adds **discovery**. Without it, sharing a fragment requires knowing its address. The registry is the answer to "how do I find fragments for data engineering workflows?" or "which postgres MCP server fragment is most widely used?" It is an index, not a source of truth.

Two goals drive the Registry design:

**GitHub stays authoritative.** Every profile and fragment in the registry has a canonical GitHub location. The registry indexes and validates that content; it does not host it. If the registry disappears, all published content remains accessible at its GitHub URL. There is no lock-in.

**The registry is a discovery convenience, not a trust anchor.** Users ultimately trust the GitHub source — the repository, its commit history, and its author. The registry adds integrity hashing (so you can verify the content you fetched matches what was indexed) and search, but it does not take on the role of "certifying" that a profile is safe to use.

---

## What the Registry Indexes

The registry indexes three content types from the v1 schema:

| Content type | `kind:` value | Indexed as |
|---|---|---|
| Complete profile | `profile` | Profile entry |
| Reusable fragment | `fragment` | Fragment entry |
| Plugin manifest | n/a (`plugin.json`) | Plugin entry |

Each entry in the index represents a specific version of a specific document at a specific GitHub location. The registry does not merge or aggregate — every indexed version is a discrete, immutable entry.

For each indexed entry, the registry stores:

- **Location**: `owner`, `repo`, `ref` (git tag or commit SHA), `path` within repo (defaults to `harness.yaml` at repo root)
- **Content hash**: SHA-256 of the document content at the indexed ref, hex-encoded
- **Metadata**: `metadata.name`, `metadata.description`, `metadata.tags`, `metadata.author`, `metadata.license` — extracted from the document
- **Index timestamp**: when the registry added this version to its index
- **Validation status**: whether the document passed v1 schema validation at index time
- **Schema version**: the Harness Protocol schema version the document declares (`version: "1"`)

The registry does not store the document content itself. It stores the hash and location. Clients fetch documents from GitHub and verify against the registry hash.

---

## Registration Flow

Registration is the act of submitting a GitHub repository to the registry index. It is not an approval process — any valid `harness.yaml` in a public GitHub repository can be registered.

```
Author submits owner/repo
         │
         ▼
Registry fetches harness.yaml from repo default branch
         │
         ▼
Validates against v1 JSON Schema
         │
    ┌────┴─────┐
    │ Invalid  │→ Returns validation errors to author
    └──────────┘
         │ Valid
         ▼
Computes SHA-256 of document content
         │
         ▼
Extracts metadata (name, description, tags, author, license)
         │
         ▼
Adds entry to index with timestamp
         │
         ▼
Returns registry URL to author
```

### Registration API

```http
POST /api/v1/register
Content-Type: application/json

{
  "repo": "harnessprotocol/harness-kit",
  "ref": "v1.2.0",
  "path": "harness.yaml"
}
```

Response on success:

```json
{
  "id": "harnessprotocol/harness-kit@v1.2.0",
  "url": "https://harnessprotocol.ai/profiles/harnessprotocol/harness-kit",
  "sha256": "a3f1e2b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
  "indexed-at": "2026-03-09T14:30:22Z"
}
```

Response on validation failure:

```json
{
  "error": "validation-failed",
  "message": "harness.yaml failed schema validation",
  "details": [
    {
      "path": "env[0]",
      "message": "sensitive variable 'DB_PASSWORD' declares a default value, which is forbidden"
    }
  ]
}
```

The `ref` parameter defaults to the repository's default branch if omitted. Authors are strongly encouraged to register specific tags (e.g., `v1.2.0`) rather than branch names — branch-based registrations point to mutable content, and the registry will re-index on each registration call rather than assuming content is stable.

### Automated re-indexing

The registry may poll registered repositories for new tags and automatically index new versions. Authors who prefer explicit control can opt out of auto-indexing and manage registration manually. The opt-out preference is stored per `owner/repo` in the registry.

Auto-indexing triggers on new semver tags (matching `v*.*.*`). Non-semver tags and branch pushes do not trigger auto-indexing.

---

## Discovery API

### Profile search

```http
GET /api/v1/profiles?q=data-engineering&tags=sql,dbt&limit=20&offset=0
```

Query parameters:
- `q` — full-text search across `metadata.name`, `metadata.description`, `metadata.tags`
- `tags` — comma-separated list of exact-match tags (AND semantics — all listed tags must be present)
- `author` — filter by `metadata.author.name` or GitHub `owner`
- `license` — filter by SPDX license identifier
- `limit` — max results per page (default 20, max 100)
- `offset` — pagination offset

Response:

```json
{
  "results": [
    {
      "id": "harnessprotocol/harness-kit",
      "latest-version": "1.2.0",
      "metadata": {
        "name": "data-engineer",
        "description": "Harness for data engineering: PostgreSQL, lineage, dbt.",
        "tags": ["data-engineering", "postgresql", "sql", "dbt"],
        "author": { "name": "John Siracusa", "url": "https://github.com/siracusa5" },
        "license": "Apache-2.0"
      },
      "downloads-30d": 142,
      "indexed-at": "2026-03-09T14:30:22Z",
      "url": "https://harnessprotocol.ai/profiles/harnessprotocol/harness-kit"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### Profile metadata

```http
GET /api/v1/profiles/{owner}/{repo}
```

Returns the registry entry for the latest indexed version, including all metadata and the SHA-256 hash.

```json
{
  "id": "harnessprotocol/harness-kit",
  "github-url": "https://github.com/harnessprotocol/harness-kit",
  "harness-url": "https://raw.githubusercontent.com/harnessprotocol/harness-kit/v1.2.0/harness.yaml",
  "latest-version": "1.2.0",
  "sha256": "a3f1e2b4c5d6e7f8...",
  "metadata": { ... },
  "indexed-at": "2026-03-09T14:30:22Z",
  "kind": "profile"
}
```

### Version list

```http
GET /api/v1/profiles/{owner}/{repo}/versions
```

Returns all indexed versions for a profile, newest first.

```json
{
  "versions": [
    {
      "version": "1.2.0",
      "ref": "v1.2.0",
      "sha256": "a3f1e2b4c5d6e7f8...",
      "indexed-at": "2026-03-09T14:30:22Z"
    },
    {
      "version": "1.1.0",
      "ref": "v1.1.0",
      "sha256": "b4c5d6e7f8a9b0c1...",
      "indexed-at": "2026-02-15T10:00:00Z"
    }
  ]
}
```

### Fragment search

```http
GET /api/v1/fragments?q=postgres&tags=database
```

Identical semantics to profile search but scoped to `kind: fragment` documents.

### Plugin search

```http
GET /api/v1/plugins?q=lineage&tags=sql
```

Scoped to `plugin.json` manifests.

### Integrity verification

```http
GET /api/v1/verify?repo=harnessprotocol/harness-kit&ref=v1.2.0
```

Returns the registry's stored SHA-256 for the given `owner/repo@ref`. Clients can fetch the document from GitHub, compute the SHA-256 locally, and compare. A mismatch between the registry hash and the locally-computed hash indicates either a registry integrity problem or that the GitHub ref was altered after indexing (force-push or tag replacement).

---

## Namespace Design

Profiles are addressed by `owner/repo` — the same namespace as GitHub. This is intentional:

- No registry-assigned IDs means no namespace squatting before a registry exists
- The `owner/repo` address works in `extends` entries in v1, before the registry exists
- Human-readable and verifiable: you can visit `github.com/owner/repo` to verify the source

Multiple harness documents can live in one repository (e.g., `harness.yaml` at the root, `harness/python.harness.yaml`, `harness/go.harness.yaml`). The registry addresses these by the `path` field:

```
harnessprotocol/harness-kit                      → root harness.yaml
harnessprotocol/harness-kit/harness/go.yaml      → go-specific profile
harnessprotocol/harness-kit/harness/python.yaml  → python-specific profile
```

The default path is `harness.yaml` at the repository root.

### Namespace conflicts

The `owner/repo` namespace inherits GitHub's namespace enforcement: two different people cannot have the same `owner/repo`. However, the registry does not control GitHub namespaces. If a GitHub account is renamed, the `owner/repo` address changes. The registry handles this by storing the GitHub URL rather than assuming the address is permanent, and by computing hashes over document content rather than addresses.

---

## Transparency Log

The registry maintains an append-only transparency log of all indexing events. The log is a public record of:

- What was indexed
- When it was indexed
- What hash the content produced at index time
- What schema version was declared

The transparency log serves several purposes:

**Auditability**: Anyone can verify that the registry's current index matches its historical log. If an entry appears in the index that is not in the log, the registry has been tampered with.

**First-seen timestamps**: The log records when each content hash was first observed by the registry. This is useful for provenance questions: "was this version published before or after the security incident?"

**Revocation detection**: If a registry entry is delisted (see Content Policy below), the log records the delisting event, the reason, and the timestamp. Content does not disappear from the log; it is marked as delisted. This prevents the registry from silently removing content without a public record.

The transparency log is append-only by construction. Log entries are structured:

```json
{
  "seq": 1042,
  "timestamp": "2026-03-09T14:30:22Z",
  "event": "index",
  "id": "harnessprotocol/harness-kit@v1.2.0",
  "sha256": "a3f1e2b4c5d6e7f8...",
  "kind": "profile",
  "schema-version": "1"
}
```

```json
{
  "seq": 1099,
  "timestamp": "2026-03-10T09:00:00Z",
  "event": "delist",
  "id": "bad-actor/malware-harness@v1.0.0",
  "reason": "content-policy-violation",
  "detail": "Profile declared instructions designed to bypass security controls."
}
```

The log is published at `https://harnessprotocol.ai/transparency-log` and served as NDJSON for easy streaming consumption.

---

## Trust Model

### The registry is not a trust anchor

The registry's primary value is discovery and integrity hashing. It is not in the business of asserting that a profile is safe to use. The trust chain runs:

```
User trusts the GitHub source
  → Registry provides the hash to verify what was indexed
  → Implementation verifies the fetched content matches the hash
  → User reviews and confirms before applying
```

The registry's integrity hash adds a specific guarantee: "when this registry entry was created, the document content hashed to this value." If you fetch the document from GitHub and compute the same hash, you know you have exactly the content the registry indexed. If the hashes differ, something changed — either on GitHub (repo was force-pushed) or the registry was tampered with.

This is useful, but it is not the same as "the registry certifies this profile is safe." A profile can have a valid hash and still contain malicious instructions.

### Verified authors (v3)

v2 does not have verified author badges. Any GitHub account can submit any repository. The registry displays the GitHub `owner` as the identity, which is at least verifiable (you can visit the GitHub profile).

v3 will introduce optional verified-author status, where authors associate a public key with their GitHub identity through a signed proof. The registry then displays "verified author" badges for profiles from accounts that have completed this process. Verification is not required to publish; it is additional signal for users who want it.

### The registry can delist but not alter

The registry can remove a profile from its search index (delisting), but it cannot alter the document content at the GitHub source. Delisting removes discoverability, not the content.

Delisting decisions are recorded in the transparency log with a reason. The registry maintains a public content policy that specifies what constitutes grounds for delisting. Automated delisting (e.g., for schema validation failures after a schema update) is distinguished from editorial delisting (human reviewer decision) in the log.

Authors whose profiles are delisted may appeal through the governance process defined in GOVERNANCE.md.

---

## Content Policy

The registry's content policy exists to protect users of the index, not to assert creative control over harness content. The policy in v2 is minimal:

**Grounds for delisting:**

1. **Schema invalidity**: The document no longer validates against the declared schema version. This can occur if the schema is updated and the document contains patterns that are newly forbidden.

2. **Manifest malicious intent**: The document contains content explicitly designed to harm users — for example, instructions designed to bypass security controls, or an MCP server command that exfiltrates user credentials on initialization. This requires a human review decision, not an automated flag.

3. **Author request**: The author of the repository requests delisting. Authors retain control over their own indexed content.

4. **Legal requirement**: A binding legal requirement (e.g., DMCA takedown, court order) requires removal.

**Not grounds for delisting:**

- The profile is opinionated, unusual, or the reviewer disagrees with its approach
- The profile declares permissions that are broad (users who apply it consent to the permissions at apply time)
- The profile's instructions are aggressive or prescriptive (instructions are user-reviewed at apply time)

The content policy is published at `https://harnessprotocol.ai/content-policy` and changes are tracked in the governance changelog.

---

## Versioning and Stability

### Registry API versioning

The discovery API is versioned under `/api/v1/`. Breaking changes to the API require a new version path (`/api/v2/`). The old version remains available for a documented deprecation period of at least 12 months.

Additive changes (new optional query parameters, new optional response fields) are not considered breaking and do not require a version bump.

### Schema version filtering

The registry accepts harnesses from any supported schema version. Search results can be filtered by schema version:

```http
GET /api/v1/profiles?schema-version=1
```

This allows clients that support only v1 to filter out documents that require newer schema features.

---

## v2 vs. v3 Scope Boundary

**v2 delivers:**
- Basic indexing of submitted `owner/repo` repositories
- Search by name, description, and tags
- Integrity hashing (SHA-256) for all indexed entries
- Transparency log
- No approval gate — any valid harness in a public repo can be submitted
- Public web UI at harnessprotocol.ai for browsing

**v3 adds:**
- Verified author badges (signed proof of GitHub identity)
- Curated collections ("official" profiles maintained by the Harness Protocol project)
- Minisign-based content signing (registry signs its index entries, enabling clients to verify registry integrity without trusting the TLS channel alone)
- Semantic similarity search (not just keyword/tag matching)
- Download metrics and trending profiles
- Plugin compatibility matrix (which profiles are compatible with which plugin versions)

The v2/v3 boundary is deliberately placed to keep v2 shippable quickly. The core value — "I can search for fragments by purpose" — arrives in v2. The trust and curation layer arrives in v3, when there is enough indexed content to make curation meaningful.
