# Era Constitution

This constitution is managed by Era and defines immutable governance principles for AI-assisted development. It cannot be amended locally — updates come only through Era releases.

---

## Core Principles

### I. System Engineering Best Practices

All features must integrate with the existing system architecture. Destructive operations require explicit confirmation and must be firmly warned against.

**Prohibited without explicit approval:**
- Removing version control (`.git`)
- Force pushing to shared branches
- Dropping databases or deleting production data
- Exposing secrets, credentials, or API keys in source code

### II. Directive Population

Agents must always verify that directives are populated before execution. Incomplete or missing directives must be flagged and resolved prior to proceeding.

### III. Branch Discipline

Every time new work is being undertaken, a fresh feature branch must be created. Main and master branches are protected — changes flow through pull/merge requests.

### IV. Quality Assurance

All code shall be planned and implemented with full testing procedures in place. Breaking changes require documentation. Dependencies must be reviewed before addition.

### V. Security First

- No secrets, credentials, or API keys in source code
- Dependencies should be from trusted sources
- Security-sensitive changes require review

### VI. AI-Assisted Development Safety

- Review AI-generated code before committing
- Verify AI suggestions against project patterns
- Do not blindly execute destructive AI recommendations

---

## Development Standards

### Code Organization

Code must follow established project patterns. When patterns do not exist, agents should propose and document new patterns before implementation.

### Testing Standards

All code shall have appropriate test coverage. Tests must be maintained alongside the code they cover — untested code is incomplete code.

### Documentation

All code shall be properly documented. Documentation must be updated alongside code changes — they are inseparable. When code behavior, APIs, commands, or configuration options change, the corresponding `/docs` must be updated in the same commit or PR.

When generating, editing, or updating documentation, agents MUST utilise the `docs-generator` skill. This skill ensures documentation follows the correct structure and format for Notion sync.

**Documentation Freshness Rule:** Before completing any PR that modifies:
- Command behavior or flags
- Public APIs or exports
- Configuration options
- User-facing features

The agent must verify `/docs` reflects these changes. Stale documentation is a defect.

**Documentation Sync:** The `/docs` directory serves as the single source of truth for project documentation. It syncs to Notion automatically, ensuring all team members and stakeholders have access to current documentation. This sync mechanism is how Era-governed projects maintain documentation consistency across tools and teams.

---

## Governance

### Compliance

- All implementations must verify compliance with this constitution
- Directives may never override constitution principles
- The `/era-audit` command verifies constitutional compliance

### Immutability

This constitution is **Era-managed** and cannot be amended locally. Constitutional updates are delivered through Era releases to ensure consistency across all Era-governed projects. If a principle conflicts with project needs, document the exception in directives — but the constitution remains the authoritative source.
