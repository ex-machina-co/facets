---
bundle: facet-design
description: Design a new OpenCode facet from idea to implementation plan
agent: plan
subtask: false
---

Load the `facet-design` skill for the design methodology (resource types, concern breakdown, decision tree).

## Idea

$ARGUMENTS

## Workflow

### Phase 1: Intake

If the user provided an idea as arguments, use it. Otherwise, ask them to describe what they want to build. Only use the `question` tool if you need to ask multiple choice questions — prefer free-form conversation for open-ended input.

### Phase 2: Explore

Investigate what already exists in the codebase:

1. Call `list-facets` to see all facets and their install status
2. Read `.opencode/facets/` to discover existing agents, skills, commands, and tools
3. Identify anything that could be reused or extended for the user's idea
4. Summarize findings: what exists, what can be reused, what gaps remain

### Phase 3: Concern Breakdown

Using the facet-design skill's framework, decompose the user's idea into individual concerns. For each concern, classify it as:

- **Knowledge** — something the facet needs to know
- **Action** — something the facet needs to do
- **Permission** — something the facet needs to restrict

Present the concerns as a table:

| #   | Concern | Type |
|-----|---------|------|
| 1   | ...     | ...  |

### Phase 4: User Gate (Concerns)

Use the `question` tool to ask the user to approve the concern breakdown. Options:

- Approve concerns as-is
- Request changes

If the user requests changes, revise and present again until approved.

### Phase 5: Resource Mapping

Walk each approved concern through the decision tree from the facet-design skill:

1. For each concern, follow the tree to determine the resource type (Skill, Command, Tool, Agent, or reuse existing)
2. For new resources, propose a name following existing conventions
3. For reusable resources, identify the existing resource to reuse

Present as a mapping table:

| Concern | Type | Tree Path | Resource |
|---------|------|-----------|----------|
| ...     | ...  | ...       | ...      |

### Phase 6: User Gate (Resources)

Use the `question` tool to ask the user to approve the resource mapping. Options:

- Approve resource mapping as-is
- Request changes

If the user requests changes, revise and present again until approved.

### Phase 7: Design Doc Persistence

Persist the approved concern table and resource mapping as a design doc using the `viper-write-plan` tool. Use the facet name as the base: `<facet-name>-design`.

The design doc should include:
- The original idea/goal
- The concern breakdown table
- The resource mapping table
- A summary of what will be built vs. reused

### Phase 8: Plan Generation

Load the `viper-planning` skill for guidance on plan structure.

Using the approved resource mapping, compose a VIPER implementation plan that:
- Creates one or more steps per new resource (Explore, Propose, Implement, Verify as needed)
- Groups related resources logically
- References the design doc by name at the top of the plan

Display the full plan to the user.

### Phase 9: User Gate (Plan)

Use the `question` tool to ask the user to approve the VIPER plan. Options:

- Approve plan as-is
- Request changes

If the user requests changes, revise and present again until approved.

### Phase 10: Plan Persistence

Persist the approved VIPER plan using the `viper-write-plan` tool. Name it `<facet-name>-plan`.

Add a note at the top of the plan referencing the design doc:

```
> Design doc: .opencode/plans/<facet-name>-design.md
```

### Phase 11: Handoff

Tell the user:
- The design doc has been saved to `.opencode/plans/<facet-name>-design.md`
- The implementation plan has been saved to `.opencode/plans/<facet-name>-plan.md`
- They can use `/viper-run` to execute the implementation plan
