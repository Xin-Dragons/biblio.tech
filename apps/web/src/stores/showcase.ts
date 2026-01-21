import { atom } from "jotai"

function getAuthHeaders(): HeadersInit {
  try {
    const sessionStr = localStorage.getItem("biblio-session")
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      if (session?.token) {
        return { Authorization: `Bearer ${session.token}` }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return {}
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  const authHeaders = getAuthHeaders()
  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value)
  }
  return fetch(url, { ...options, headers })
}

export type ShowcaseSizeClass = "small" | "medium" | "large" | "xlarge"

export interface ShowcaseConfig {
  enabled: boolean
  items: string[]
  order: string[]
  sizes: Record<string, ShowcaseSizeClass>
  updatedAt: number
}

export interface ShowcaseNft {
  mint: string
  name: string
  image: string
  collectionName: string | null
}

export interface PublicShowcase {
  username: string
  publicKey: string
  dandyCount: number
  votes: number
  showcase: {
    items: ShowcaseNft[]
    order: string[]
    sizes: Record<string, ShowcaseSizeClass>
    updatedAt: number
  }
}

export interface LeaderboardEntry {
  username: string
  votes: number
  dandyCount: number
}

// Current user's username
export const usernameAtom = atom<string | null>(null)
export const usernameLoadingAtom = atom(false)

// Current user's showcase config
export const showcaseConfigAtom = atom<ShowcaseConfig | null>(null)
export const showcaseLoadingAtom = atom(false)

// Username availability check
export const usernameAvailabilityAtom = atom<{ username: string; available: boolean; valid: boolean } | null>(null)

// Fetch current user's username
export const fetchUsernameAtom = atom(null, async (_get, set) => {
  set(usernameLoadingAtom, true)
  try {
    const res = await authFetch("/api/user/username")
    if (res.ok) {
      const data = await res.json()
      set(usernameAtom, data.username)
    }
  } catch {
    // Ignore errors
  } finally {
    set(usernameLoadingAtom, false)
  }
})

// Claim username
export const claimUsernameAtom = atom(
  null,
  async (_get, set, username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authFetch("/api/user/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })

      if (res.ok) {
        const data = await res.json()
        set(usernameAtom, data.username)
        return { success: true }
      }

      const err = await res.json()
      return { success: false, error: err.error ?? "Failed to claim username" }
    } catch {
      return { success: false, error: "Network error" }
    }
  }
)

// Release username
export const releaseUsernameAtom = atom(null, async (_get, set) => {
  try {
    const res = await authFetch("/api/user/username", { method: "DELETE" })
    if (res.ok) {
      set(usernameAtom, null)
      return true
    }
  } catch {
    // Ignore errors
  }
  return false
})

// Check username availability
export const checkUsernameAtom = atom(null, async (_get, set, username: string) => {
  if (!username || username.length < 3) {
    set(usernameAvailabilityAtom, null)
    return
  }

  try {
    const res = await fetch(`/api/showcase/check/${encodeURIComponent(username)}`)
    if (res.ok) {
      const data = await res.json()
      set(usernameAvailabilityAtom, data)
    }
  } catch {
    set(usernameAvailabilityAtom, null)
  }
})

const DEFAULT_SHOWCASE_CONFIG: ShowcaseConfig = {
  enabled: false,
  items: [],
  order: [],
  sizes: {},
  updatedAt: 0,
}

// Fetch current user's showcase config
export const fetchShowcaseConfigAtom = atom(null, async (_get, set) => {
  set(showcaseLoadingAtom, true)
  try {
    const res = await authFetch("/api/user/showcase")
    if (res.ok) {
      const data = await res.json()
      set(showcaseConfigAtom, data ?? DEFAULT_SHOWCASE_CONFIG)
    } else {
      set(showcaseConfigAtom, DEFAULT_SHOWCASE_CONFIG)
    }
  } catch {
    set(showcaseConfigAtom, DEFAULT_SHOWCASE_CONFIG)
  } finally {
    set(showcaseLoadingAtom, false)
  }
})

// Update showcase config
export const updateShowcaseConfigAtom = atom(
  null,
  async (get, set, updates: Partial<ShowcaseConfig>): Promise<boolean> => {
    const current = get(showcaseConfigAtom)
    const updated = { ...current, ...updates }
    set(showcaseConfigAtom, updated as ShowcaseConfig)

    try {
      const res = await authFetch("/api/user/showcase", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const data = await res.json()
        set(showcaseConfigAtom, data)
        return true
      }
    } catch {
      // Revert on error
      set(showcaseConfigAtom, current)
    }
    return false
  }
)

// Fetch public showcase
export const fetchPublicShowcaseAtom = atom(
  null,
  async (_get, _set, username: string): Promise<PublicShowcase | null> => {
    try {
      const res = await fetch(`/api/showcase/${encodeURIComponent(username)}`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Ignore errors
    }
    return null
  }
)

// Voting
export const remainingVotesAtom = atom<{ remaining: number; votedFor: string[] } | null>(null)
export const leaderboardAtom = atom<LeaderboardEntry[]>([])
export const leaderboardLoadingAtom = atom(false)

// Fetch remaining votes for current user
export const fetchRemainingVotesAtom = atom(null, async (_get, set) => {
  try {
    const res = await authFetch("/api/showcase/votes/remaining")
    if (res.ok) {
      const data = await res.json()
      set(remainingVotesAtom, data)
    }
  } catch {
    // Ignore errors
  }
})

// Vote for a showcase
export const voteForShowcaseAtom = atom(
  null,
  async (_get, set, username: string): Promise<{ success: boolean; error?: string; remaining?: number }> => {
    try {
      const res = await authFetch(`/api/showcase/${encodeURIComponent(username)}/vote`, {
        method: "POST",
      })

      const data = await res.json()

      if (res.ok) {
        set(remainingVotesAtom, (prev) =>
          prev
            ? { remaining: data.remaining ?? prev.remaining - 1, votedFor: [...prev.votedFor, username] }
            : { remaining: data.remaining ?? 2, votedFor: [username] }
        )
        return { success: true, remaining: data.remaining }
      }

      return { success: false, error: data.error ?? "Failed to vote" }
    } catch {
      return { success: false, error: "Network error" }
    }
  }
)

// Fetch leaderboard
export const fetchLeaderboardAtom = atom(null, async (_get, set) => {
  set(leaderboardLoadingAtom, true)
  try {
    const res = await fetch("/api/showcase/leaderboard")
    if (res.ok) {
      const data = await res.json()
      set(leaderboardAtom, data)
    }
  } catch {
    // Ignore errors
  } finally {
    set(leaderboardLoadingAtom, false)
  }
})

// Dandy locking
export interface DandyInfo {
  mint: string
  name: string
  image: string
  owner: string
  locked: boolean
  lockedToBiblio: boolean
}

export const dandiesAtom = atom<DandyInfo[]>([])
export const dandiesLoadingAtom = atom(false)

export const fetchDandiesAtom = atom(null, async (_get, set) => {
  set(dandiesLoadingAtom, true)
  try {
    const res = await authFetch("/api/lock/dandies")
    if (res.ok) {
      const data = await res.json()
      set(dandiesAtom, data.dandies ?? [])
    }
  } catch {
    // Ignore errors
  } finally {
    set(dandiesLoadingAtom, false)
  }
})

export const buildLockTxAtom = atom(
  null,
  async (_get, _set, { mint, owner }: { mint: string; owner: string }): Promise<{ transaction: string; blockhash: string; lastValidBlockHeight: number } | null> => {
    try {
      const res = await authFetch("/api/lock/build-lock-tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint, owner }),
      })

      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Ignore errors
    }
    return null
  }
)
