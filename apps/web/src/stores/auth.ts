import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { API_BASE } from "@/lib/api"

interface Session {
  token: string
  userId: string
  wallet: string
  expiresAt: number
}

export const sessionAtom = atomWithStorage<Session | null>("biblio-session", null)

// Tracks which wallet connector is currently connected
interface ConnectedWalletInfo {
  id: string
  name: string
}
export const connectedWalletAtom = atomWithStorage<ConnectedWalletInfo | null>("connected-wallet", null)

// Tracks when user explicitly signed out (prevents auto-sign-in until reconnect)
export const explicitlySignedOutAtom = atom(false)

// Atom to signal when session changes (for clearing dependent state)
export const sessionChangedAtom = atom(0)

export const isAuthenticatedAtom = atom((get) => {
  const session = get(sessionAtom)
  if (!session) return false
  return session.expiresAt > Date.now()
})

export const signInAtom = atom(
  null,
  async (
    _get,
    set,
    { publicKey, signMessage }: { publicKey: string; signMessage: (message: Uint8Array) => Promise<Uint8Array> }
  ) => {
    try {
      const nonceRes = await fetch(`${API_BASE}/auth/nonce`)
      if (!nonceRes.ok) throw new Error("Failed to get nonce")
      const { nonce } = await nonceRes.json()

      const message = `Sign this message to authenticate with Biblio.\n\nNonce: ${nonce}`
      const encodedMessage = new TextEncoder().encode(message)
      const signature = await signMessage(encodedMessage)

      const verifyRes = await fetch(`${API_BASE}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey,
          signature: btoa(String.fromCharCode(...signature)),
          message,
        }),
      })

      if (!verifyRes.ok) throw new Error("Failed to verify signature")

      const { token, userId, expiresAt } = await verifyRes.json()
      set(sessionAtom, { token, userId, wallet: publicKey, expiresAt })
      return true
    } catch (err) {
      console.error("Sign in failed:", err)
      return false
    }
  }
)

export const signOutAtom = atom(null, async (get, set) => {
  const session = get(sessionAtom)
  if (session?.token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      })
    } catch {
      // Ignore errors
    }
  }
  set(sessionAtom, null)
})

export const authFetchAtom = atom((get) => {
  const session = get(sessionAtom)
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`)
    }
    return fetch(url, { ...options, headers })
  }
})
