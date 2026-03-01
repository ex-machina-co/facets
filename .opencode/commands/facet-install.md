---
bundle: core
description: Install OpenCode facets (agents, commands, skills)
agent: facet-installer
subtask: false
---

TARGET=$1

## Workflow

If a target is provided, attempt to run `install-facet` with that target. Otherwise, follow this 4-step flow exactly:

#### Rules for workflow

- MUST set `custom: false` for ALL questions asked via the `question` tool
-

### Step 1: Browse facets

1. Call `list-facets` to get the facet catalog.

2. Present each facet with:
   - Name
   - Whether it's currently installed
   - Whether it's available (has `available: true`)
   - A brief description of what the facet enables

3. If any facets have `available: false`, show them in a separate section BEFORE the selection questions:

    ### Unavailable Facets

    These facets can't be installed because required tools are missing:

    | Facet  | Issue                     | Error                    |
    |--------|---------------------------|--------------------------|
    | <name> | `<verifyFailure.command>` | "<verifyFailure.output>" |

4. Build the selection questions
    - Only include facets with `available: true` in the install question.
    - If there are NO available uninstalled facets, skip the install question entirely and only show the update question.
    ```ts
    const questions = []

    // Only add install question if there are available, uninstalled facets
    const installable = facets.filter(b => !b.installed && b.available)
    if (installable.length > 0) {
      questions.push({
        question: 'Which facets would you like to install?',
        header: 'Install Facets',
        // only show facets that are not installed AND available
        options: [{ label: '<facet_name>', description: '<facet description>' }],
        multiple: true,
        custom: false, // ENSURE THIS IS FALSE!!
      })
    }

    // Always show update question if there are installed facets
    const updatable = facets.filter(b => b.installed)
    if (updatable.length > 0) {
      questions.push({
        question: 'Which facets would you like to update or re-install?',
        header: 'Update Facets',
        // only show facets that are partially or fully installed
        options: [{ label: '<facet_name>', description: '<facet description>' }],
        multiple: true,
        custom: false, // ENSURE THIS IS FALSE!!
      })
    }
    ```

### Step 2: Show details

For each selected facet, show the detailed resource breakdown:

- List every resource (agent, command, skill) that will be installed, grouped by facet
- If a resource appears in multiple selected facets, show it under EACH facet
- Show the resource name, type, and description

### Step 3: Confirm

Use the `question` tool to ask the user to confirm they want to proceed with installation. Show a clear yes/no choice.
If the user declines, return to Step 1 or exit.

### Step 4: Install

Only after confirmation:

1. Call `install-facet` for each selected facet.
2. If the result includes a failure, report the failed command and its output to the user. Do NOT attempt to fix the
   failure or suggest workarounds — just show what failed.
3. If all results are successful, report success and tell the user to restart OpenCode to pick up new resources.

## Presentation

When displaying facet resources, use these emoji-prefixed type labels:

| Emoji | Type    |
|-------|---------|
| 🤖    | Agent   |
| 🎯    | Skill   |
| ⚡     | Command |
| 📦    | Facet   |

In Step 2 (Show details), present each facet's resources using this format:


📦 facet-name

| Type      | Resource        | Description                |
|-----------|-----------------|----------------------------|
| 🤖 Agent  | example-agent   | Description of the agent   |
| 🎯 Skill  | example-skill   | Description of the skill   |
| ⚡ Command | example-command | Description of the command |
