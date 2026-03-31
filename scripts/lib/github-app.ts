/**
 * Mints a short-lived GitHub installation token from a GitHub App.
 *
 * Requires these environment variables:
 * - APP_ID: The GitHub App's ID
 * - APP_PRIVATE_KEY_BASE64: The App's private key, base64-encoded
 * - APP_INSTALLATION_ID: The installation ID for the target org
 */

import { createAppAuth } from '@octokit/auth-app'

export async function mintGitHubAppToken(): Promise<string> {
  const { APP_ID, APP_PRIVATE_KEY_BASE64, APP_INSTALLATION_ID } = process.env

  if (!APP_ID || !APP_PRIVATE_KEY_BASE64 || !APP_INSTALLATION_ID) {
    throw new Error('Missing required env vars: APP_ID, APP_PRIVATE_KEY_BASE64, APP_INSTALLATION_ID')
  }

  const privateKey = Buffer.from(APP_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')

  const auth = createAppAuth({
    appId: APP_ID,
    privateKey,
    installationId: Number(APP_INSTALLATION_ID),
  })

  const { token } = await auth({ type: 'installation' })
  return token
}
