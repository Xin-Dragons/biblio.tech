import { atom } from "jotai"
import { API_BASE } from "@/lib/api"

export enum Tier {
  Free = "Free",
  Bronze = "Bronze",
  Silver = "Silver",
  Gold = "Gold",
  Diamond = "Diamond",
}

export interface TierInfo {
  tier: Tier
  stakedCount: number
  votesPerDay: number
  feeDiscount: number
  hasVanityAccess: boolean
}

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

export const tierAtom = atom<TierInfo | null>(null)
export const tierLoadingAtom = atom(false)

export const fetchTierAtom = atom(null, async (_get, set) => {
  set(tierLoadingAtom, true)
  try {
    const res = await authFetch(`${API_BASE}/user/tier`)
    if (res.ok) {
      const data = await res.json()
      set(tierAtom, data)
    }
  } catch {
    // Ignore errors
  } finally {
    set(tierLoadingAtom, false)
  }
})
