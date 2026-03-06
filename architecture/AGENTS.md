# ADR Guidelines

> **READ FIRST:** [`strategy/processes/architecture/README.md`](../strategy/processes/architecture/README.md) — the canonical ADR process, including abstraction level guidance.

**Canonical template:** [`strategy/processes/architecture/000-adr-template.md`](../strategy/processes/architecture/000-adr-template.md)

## Quick Reference

- ADRs document **architectural decisions** — not REST endpoints, DB schemas, or code structure
- **Specification ADRs** (contracts for interoperability): field names and formats are appropriate
- **System/product ADRs** (how to build something): focus on boundaries, responsibilities, and trade-offs — leave implementation to the dev team
- Litmus test: *Is this detail part of a contract that external consumers depend on?* If not, leave it out.
- Use `NNN-slug.md` naming (e.g., `001-auth-strategy.md`)
- Status values: `proposed`, `accepted`, `superseded`
- Superseded ADRs move to `superseded/`
- Modified ADRs stay in place with `modified-by` frontmatter

## File Organization

```
architecture/
├── AGENTS.md                    # This file
├── NNN-decision.md              # Active ADRs
└── superseded/
    └── NNN-old-decision.md      # Fully superseded ADRs
```
