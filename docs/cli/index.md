---
title: Overview
description: How to use the `facet` CLI
---

The `facet` CLI helps you create, build, and manage facets — portable bundles of AI tooling configuration.

### Authoring

<Columns cols={2}>
  <Card title={<Badge>facet create</Badge>} href={"/docs/cli/create"}>
    Create a new **facet** project interactively
  </Card>
  <Card title={<Badge>facet build</Badge>} href="/docs/cli/build">
    Validate and build a **facet** for distribution
  </Card>
</Columns>

### Package management

<Columns cols={2}>
  <Card title={<Badge>facet add</Badge>} href={"/docs/cli/add"}>
    Installs a **facet** and adds it to `facets.yaml`
  </Card>
  <Card title={<Badge>facet remove</Badge>} href="/docs/cli/remove">
    Removes a **facet** from `facets.yaml`
  </Card>
  <Card title={<Badge>facet install</Badge>} href="/docs/cli/install">
    Installs all **facets** from the facet manifest
  </Card>
  <Card title={<Badge>facet upgrade</Badge>} href="/docs/cli/upgrade">
    Upgrades installed **facets** through an interactive CLI
  </Card>
</Columns>