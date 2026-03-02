import { parse, stringify } from 'comment-json'
import { facetsYamlPath } from '../registry/files.ts'

const OPENCODE_CONFIG_PATH = '.opencode/opencode.jsonc'

const MCP_SERVER_CONFIG = {
  type: 'local',
  command: ['bunx', 'facets-mcp'],
  enabled: true,
} as const

/**
 * Initialize a project for facets:
 * 1. Register the facets MCP server in .opencode/opencode.jsonc
 * 2. Create facets.yaml if absent
 */
export async function initProject(projectRoot: string): Promise<void> {
  const configPath = `${projectRoot}/${OPENCODE_CONFIG_PATH}`

  // Ensure .opencode/ directory exists
  await Bun.$`mkdir -p ${projectRoot}/.opencode`

  // Read or create opencode.jsonc
  let config: Record<string, unknown>
  let configText: string

  try {
    configText = await Bun.file(configPath).text()
    config = parse(configText) as Record<string, unknown>
  } catch {
    // Config doesn't exist — create a new one
    config = {}
    configText = '{}'
  }

  // Check if MCP server is already registered
  const mcp = (config.mcp ?? {}) as Record<string, unknown>
  if (mcp.facets) {
    console.log('Project already configured for facets.')
    return
  }

  // Register the facets MCP server
  mcp.facets = MCP_SERVER_CONFIG
  config.mcp = mcp

  // Write back preserving comments
  const newConfig = stringify(config, null, 2)
  await Bun.write(configPath, `${newConfig}\n`)
  console.log(`Registered facets MCP server in ${OPENCODE_CONFIG_PATH}`)

  // Create facets.yaml if absent
  const yamlPath = facetsYamlPath(projectRoot)
  if (!(await Bun.file(yamlPath).exists())) {
    await Bun.write(yamlPath, '# Facet dependencies for this project\nlocal: []\nremote: {}\n')
    console.log('Created facets.yaml')
  }
}
