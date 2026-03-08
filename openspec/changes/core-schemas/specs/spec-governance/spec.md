## ADDED Requirements

### Requirement: Category-domain naming for sibling domains

When multiple independent domains share a parent concept, they MAY use `__` (double underscore) to encode the category: `category__domain`. Each `category__domain` SHALL be a fully independent spec with its own `spec.md`. The `__` separator SHALL NOT be used for domain-feature relationships where the feature is a capability within a single domain.

#### Scenario: Sibling domains share a category

- **WHEN** two or more domains are independent systems under a shared concept (e.g., facet authoring and server authoring are both authoring systems)
- **THEN** they MAY use `category__domain` naming (e.g., `authoring__facets`, `authoring__servers`)
- **AND** each SHALL have its own independent spec at `openspec/specs/category__domain/spec.md`

#### Scenario: Feature within a domain does not use category separator

- **WHEN** a capability is a feature within a single domain (e.g., login within auth, prompt resolution within facet authoring)
- **THEN** it SHALL NOT use `__` to create a separate spec
- **AND** it SHALL be expressed as a requirement within the parent domain's spec

#### Scenario: Standalone domain does not require a category

- **WHEN** a domain has no sibling domains under a shared concept (e.g., `installation`, `spec-governance`)
- **THEN** it SHALL use a plain kebab-case name without a `__` separator

## MODIFIED Requirements

### Requirement: Specifications are organized by product domain

Specs SHALL be organized by the product domain that delivers customer value, not by infrastructure domain. Each spec directory SHALL use flat naming under `openspec/specs/` — either plain kebab-case (e.g., `installation`) or category-qualified with `__` (e.g., `authoring__facets`).

#### Scenario: Execution persistence belongs in the execution spec

- **WHEN** a developer needs to spec persistence behavior for the execution domain
- **THEN** the requirements SHALL be placed in the `execution` spec (the product domain delivering value)
- **AND** the requirements SHALL NOT be placed in a `state-machines` or `task-persistence` spec (infrastructure concerns, not product domains)

#### Scenario: Naming convention for specs

- **WHEN** a new spec is created for a product domain
- **THEN** the directory name SHALL use either plain kebab-case (e.g., `planning`, `execution`, `spec-governance`) or category-qualified naming with `__` (e.g., `authoring__facets`, `authoring__servers`)

#### Scenario: One spec per domain

- **WHEN** a product domain is specified
- **THEN** the domain SHALL have exactly one spec at `openspec/specs/<domain>/spec.md`
- **AND** all capabilities within the domain SHALL be expressed as requirements within that single spec
- **AND** the domain SHALL NOT be split into multiple specs per capability (e.g., `execution-loop` and `execution-triggering` are requirements within the `execution` spec, not separate specs; `auth-login` is a requirement within the `auth` spec, not a separate spec)
