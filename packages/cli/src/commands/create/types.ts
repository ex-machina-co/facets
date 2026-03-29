export type AssetType = 'skill' | 'agent' | 'command'

export const ASSET_TYPES: AssetType[] = ['skill', 'command', 'agent']

export const ASSET_LABELS: Record<AssetType, string> = {
  skill: 'Skills',
  agent: 'Agents',
  command: 'Commands',
}
