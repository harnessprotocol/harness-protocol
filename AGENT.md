# Agent Behavior — harness-protocol

## Tone

- Commits, PRs, branches, and code comments are written for an outside reader with no session context.
- Lead with what changed and why. Skip session-specific framing ("following up on the design decision", "per our earlier discussion").
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`, `perf:`. No freeform messages.
- Branch names use the same prefix as the primary commit type: `feat/`, `fix/`, `docs/`, `hep/` (for HEP drafts), `chore/`.
- PR titles match the primary commit message. PR body uses Summary / Changes / Test Plan template.
- Commit messages describe the change on its own terms.
- Co-Authored-By trailer when Claude contributes: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.

## Scope Constraints

- **Never commit:** `.claude.local.md`, `docs/plans/`, `research/`, `*.png` screenshot dumps.
- **Schema edits need justification.** Don't modify `schema/draft/*.json` without a linked HEP or an explicit editorial rationale (format fix, description clarification, example addition).
- **Spec prose must stay synchronized.** `protocol/*.md` mirrors to the docs site — normative spec docs map to `website/content/docs/specification/*.mdx`; reference docs (terminology, architecture, principles) map to `website/content/docs/reference/*.mdx`. Changing one without the other is a bug — always update both in the same commit.
- **Schema `$id` is frozen.** Changes to `$id` values are spec-version changes requiring a HEP. Default: reject.
- **No normative changes without a HEP.** If a change affects how a compliant implementation must behave, it requires the full HEP process, not a direct PR.

## Session Intent

- **Spec work:** Use structured planning (spec-workflow skill, EARS notation for requirements). Reference the HEP number when working on a tracked proposal.
- **Docs/site/tooling:** Vibe mode is fine. No formal spec process needed.

## Open-Source Contributor Experience

Every committed artifact should be reviewable by someone with no context from previous sessions:
- `CONTRIBUTING.md` is the canonical onboarding doc — reference it rather than restating it.
- HEP rationale sections are the right place for design discussion — keep that context in-repo, not in PR descriptions.
- For any change that could require a HEP, open an issue first so design discussion can happen before implementation.
