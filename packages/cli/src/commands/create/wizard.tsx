import { render } from 'ink'
import { CreateWizard } from '../../tui/views/create/wizard.tsx'
import type { CreateOptions } from '../create-scaffold.ts'

export async function runCreateWizardInk(): Promise<CreateOptions | null> {
  return new Promise<CreateOptions | null>((resolve) => {
    let result: CreateOptions | null = null

    const instance = render(
      <CreateWizard
        onComplete={(opts) => {
          result = opts
        }}
        onCancel={() => {
          result = null
        }}
      />,
    )

    instance.waitUntilExit().then(() => {
      resolve(result)
    })
  })
}
