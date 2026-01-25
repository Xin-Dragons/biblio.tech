import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { sessionAtom } from "./auth"

export interface LinkedWallet {
  publicKey: string
  nickname?: string
  isMain: boolean
  addedAt: number
}

function getAuthHeaders(token: string | undefined): HeadersInit {
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

export const linkedWalletsAtom = atomWithStorage<LinkedWallet[]>("biblio-linked-wallets", [])

export const linkedWalletsLoadingAtom = atom<boolean>(false)

export const linkedWalletsErrorAtom = atom<string | null>(null)

export const fetchLinkedWalletsAtom = atom(null, async (get, set) => {
  const session = get(sessionAtom)
  if (!session?.token) {
    set(linkedWalletsAtom, [])
    return
  }

  set(linkedWalletsLoadingAtom, true)
  set(linkedWalletsErrorAtom, null)

  try {
    const res = await fetch("/api/user/wallets", {
      headers: getAuthHeaders(session.token),
    })

    if (!res.ok) {
      throw new Error("Failed to fetch linked wallets")
    }

    const wallets = (await res.json()) as LinkedWallet[]
    set(linkedWalletsAtom, wallets)
  } catch (err) {
    console.error("Error fetching linked wallets:", err)
    set(linkedWalletsErrorAtom, err instanceof Error ? err.message : "Failed to fetch linked wallets")
    set(linkedWalletsAtom, [])
  } finally {
    set(linkedWalletsLoadingAtom, false)
  }
})

interface LinkWalletInput {
  publicKey: string
  signature: string
  message: string
  isLedger: boolean
  rawTransaction?: string
}

export const linkWalletAtom = atom(null, async (get, set, input: LinkWalletInput) => {
  const session = get(sessionAtom)
  if (!session?.token) {
    throw new Error("Not authenticated")
  }

  const res = await fetch("/api/user/wallets/link", {
    method: "POST",
    headers: {
      ...getAuthHeaders(session.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Failed to link wallet" }))
    throw new Error(errorData.error || "Failed to link wallet")
  }

  const newWallet = (await res.json()) as LinkedWallet
  set(linkedWalletsAtom, (prev) => [...prev, newWallet])
  return newWallet
})

export const unlinkWalletAtom = atom(null, async (get, set, publicKey: string) => {
  const session = get(sessionAtom)
  if (!session?.token) {
    throw new Error("Not authenticated")
  }

  const res = await fetch(`/api/user/wallets/${publicKey}`, {
    method: "DELETE",
    headers: getAuthHeaders(session.token),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Failed to unlink wallet" }))
    throw new Error(errorData.error || "Failed to unlink wallet")
  }

  set(linkedWalletsAtom, (prev) => prev.filter((w) => w.publicKey !== publicKey))
})

export const otherLinkedWalletsAtom = atom((get) => {
  const session = get(sessionAtom)
  const linkedWallets = get(linkedWalletsAtom)
  if (!session?.wallet) return linkedWallets
  return linkedWallets.filter((w) => w.publicKey !== session.wallet)
})

export const clearLinkedWalletsAtom = atom(null, (_get, set) => {
  set(linkedWalletsAtom, [])
  set(linkedWalletsErrorAtom, null)
})
