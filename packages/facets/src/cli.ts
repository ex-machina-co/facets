#!/usr/bin/env bun
import { createInterface } from 'node:readline'
import pkg from '../package.json' with { type: 'json' }
import { cacheFacet } from './discovery/cache.ts'
import { clearCache } from './discovery/clear.ts'
import { listFacets } from './discovery/list.ts'
import { installFacet } from './installation/install.ts'
import { uninstallFacet } from './installation/uninstall.ts'

async function promptPrereqApproval(commands: string[]): Promise<boolean> {
  console.log('The following prerequisite checks will be run:')
  for (const cmd of commands) {
    console.log(`  ${cmd}`)
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) => {
    rl.question('Run these prerequisite checks? (y/N) ', resolve)
  })
  rl.close()

  return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes'
}

const HELP = `Usage: facets <command> [options]

Commands:
  init                Set up project for facets
  list                List all facets and their status
  add <url>           Cache a remote facet by URL
  install [name]      Install a facet's resources
  remove <name>       Remove a facet
  update [name]       Update cached remote facets
  cache clear         Clear the global facet cache

Options:
  --help, -h          Show this help message
  --version, -v       Show version`

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP)
    process.exit(0)
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(pkg.version)
    process.exit(0)
  }

  const command = args[0]

  switch (command) {
    case 'init':
      await cmdInit()
      break
    case 'list':
      await cmdList()
      break
    case 'add':
      await cmdAdd(args[1])
      break
    case 'install':
      await cmdInstall(args[1])
      break
    case 'remove':
      await cmdRemove(args[1])
      break
    case 'update':
      await cmdUpdate(args[1])
      break
    case 'cache':
      if (args[1] === 'clear') {
        await cmdCacheClear()
      } else {
        console.error(`Unknown cache subcommand: ${args[1]}`)
        console.error('Usage: facets cache clear')
        process.exit(1)
      }
      break
    default:
      console.error(`Unknown command: ${command}`)
      console.log(HELP)
      process.exit(1)
  }
}

async function cmdInit() {
  const { initProject } = await import('./cli/init.ts')
  await initProject(process.cwd())
}

async function cmdList() {
  const projectRoot = process.cwd()
  const result = await listFacets(projectRoot)

  if (result.facets.length === 0) {
    console.log('No facets declared.')
    return
  }

  for (const facet of result.facets) {
    const status = facet.installed ? 'installed' : 'not installed'
    const version = facet.version ? `v${facet.version}` : ''
    const source = facet.source === 'local' ? 'local' : 'remote'
    console.log(`  ${facet.name} ${version} (${source}) [${status}]`)
    if (facet.description) {
      console.log(`    ${facet.description}`)
    }
    if (facet.requires.length > 0) {
      console.log(`    requires: ${facet.requires.join(', ')}`)
    }
  }
}

async function cmdAdd(url: string | undefined) {
  if (!url) {
    console.error('Usage: facets add <url>')
    process.exit(1)
  }

  const projectRoot = process.cwd()
  const result = await cacheFacet(url, projectRoot)

  if (result.success) {
    console.log(`Cached: ${result.name} v${result.version}`)
  } else {
    console.error(`Failed to cache facet: ${result.error}`)
    process.exit(1)
  }
}

async function cmdInstall(name: string | undefined) {
  const projectRoot = process.cwd()

  if (!name) {
    // Install all declared facets
    const list = await listFacets(projectRoot)
    for (const facet of list.facets) {
      if (!facet.installed) {
        const result = await installFacet(facet.name, projectRoot, {
          onPrereqApproval: promptPrereqApproval,
        })
        if (result.success) {
          console.log(`Installed: ${facet.name}`)
        } else {
          console.error(`Failed to install ${facet.name}: ${result.reason}`)
        }
      }
    }
    return
  }

  const result = await installFacet(name, projectRoot, {
    onPrereqApproval: promptPrereqApproval,
  })
  if (result.success) {
    console.log(`Installed: ${name}`)
    for (const r of result.resources) {
      console.log(`  ${r.type}: ${r.name}`)
    }
  } else {
    console.error(`Failed to install ${name}: ${result.reason}`)
    if (result.reason === 'prereq' && 'failure' in result) {
      console.error(`  Command failed: ${result.failure.command}`)
    }
    process.exit(1)
  }
}

async function cmdRemove(name: string | undefined) {
  if (!name) {
    console.error('Usage: facets remove <name>')
    process.exit(1)
  }

  const projectRoot = process.cwd()
  const result = await uninstallFacet(name, projectRoot)

  if (result.success) {
    console.log(`Removed: ${name}`)
  } else {
    console.error(`Failed to remove ${name}: ${result.reason}`)
    process.exit(1)
  }
}

async function cmdUpdate(name: string | undefined) {
  const { updateFacet, updateAllFacets } = await import('./discovery/cache.ts')

  if (name) {
    const result = await updateFacet(name, process.cwd())
    if (result.success) {
      if (result.updated) {
        console.log(`Updated: ${name} → v${result.version}`)
      } else {
        console.log(`${name}: already current (v${result.version})`)
      }
    } else {
      console.error(`Failed to update ${name}: ${result.error}`)
      process.exit(1)
    }
  } else {
    const results = await updateAllFacets(process.cwd())
    for (const result of results) {
      if (result.success) {
        if (result.updated) {
          console.log(`Updated: ${result.name} → v${result.version}`)
        } else {
          console.log(`${result.name}: already current`)
        }
      } else {
        console.error(`Failed to update ${result.name}: ${result.error}`)
      }
    }
  }
}

async function cmdCacheClear() {
  await clearCache()
  console.log('Cache cleared.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
