# ADR Guidelines

This project follows the Ex Machina architectural decision process.

**Canonical process definition:** [`strategy/processes/architecture/README.md`](../strategy/processes/architecture/README.md)

**Canonical template:** [`strategy/processes/architecture/000-adr-template.md`](../strategy/processes/architecture/000-adr-template.md)

See those documents for the full ADR process, including structure, status values, frontmatter fields, relationship tracking, and examples.

## Quick Reference

- ADRs document **architectural decisions**, not implementation details
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
