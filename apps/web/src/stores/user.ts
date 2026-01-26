import { atom } from "jotai"
import { atomWithStorage, createJSONStorage } from "jotai/utils"

export interface Tag {
  id: string
  name: string
  color: string
}

export type Preferences = {
  layoutSize: "small" | "medium" | "large"
  showInfo: boolean
  sort: string
  lightMode: boolean
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

const setStorage = createJSONStorage<string[]>(() => localStorage)

// Store as array, convert to Set on read
const starredArrayAtom = atomWithStorage<string[]>("biblio-starred", [], setStorage)
const junkArrayAtom = atomWithStorage<string[]>("biblio-junk", [], setStorage)

// Derived atoms that convert arrays to Sets for efficient lookup
export const starredAtom = atom(
  (get) => new Set(get(starredArrayAtom)),
  (_get, set, value: Set<string>) => set(starredArrayAtom, [...value])
)

export const junkAtom = atom(
  (get) => new Set(get(junkArrayAtom)),
  (_get, set, value: Set<string>) => set(junkArrayAtom, [...value])
)

export const tagsAtom = atomWithStorage<Tag[]>("biblio-tags", [])

export const nftTagsAtom = atomWithStorage<Record<string, string[]>>("biblio-nft-tags", {})

// Loading state for tags (to avoid flash of empty state)
export const tagsLoadingAtom = atom(false)

// Fetch tags from API - called on authenticated app load
export const fetchTagsAtom = atom(null, async (_get, set) => {
  set(tagsLoadingAtom, true)
  try {
    const res = await authFetch("/api/user/tags")
    if (res.ok) {
      const tags = (await res.json()) as Tag[]
      set(tagsAtom, tags)
    }
  } catch {
    // Ignore errors - user might not be authenticated or API unavailable
  } finally {
    set(tagsLoadingAtom, false)
  }
})

// Fetch nft-tag associations from API - called on authenticated app load
export const fetchNftTagsAtom = atom(null, async (_get, set) => {
  try {
    const res = await authFetch("/api/user/nft-tags")
    if (res.ok) {
      const nftTags = (await res.json()) as Record<string, string[]>
      set(nftTagsAtom, nftTags)
    }
  } catch {
    // Ignore errors - user might not be authenticated or API unavailable
  }
})

// Collage layout - stored in user DO
export interface CollageLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}
export const collageLayoutAtom = atom<CollageLayoutItem[]>([])

export const fetchCollageLayoutAtom = atom(null, async (_get, set, context: string = "nfts") => {
  try {
    const res = await authFetch(`/api/user/layout/${context}`)
    if (res.ok) {
      const data = (await res.json()) as CollageLayoutItem[]
      set(collageLayoutAtom, data ?? [])
    }
  } catch {
    // Ignore errors - user might not be authenticated
  }
})

export const saveCollageLayoutAtom = atom(
  null,
  async (_get, set, layout: CollageLayoutItem[], context: string = "nfts") => {
    set(collageLayoutAtom, layout)
    try {
      await authFetch(`/api/user/layout/${context}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      })
    } catch {
      // Ignore errors - user might not be authenticated
    }
  }
)

// Collage sizes - stored in user DO
export type CollageSizeClass = "small" | "medium" | "large" | "xlarge"
export const collageSizesAtom = atom<Record<string, CollageSizeClass>>({})

export const fetchCollageSizesAtom = atom(null, async (_get, set, context: string = "nfts") => {
  try {
    const res = await authFetch(`/api/user/sizes/${context}`)
    if (res.ok) {
      const data = (await res.json()) as Record<string, CollageSizeClass>
      set(collageSizesAtom, data ?? {})
    }
  } catch {
    // Ignore errors - user might not be authenticated
  }
})

export const saveCollageSizesAtom = atom(
  null,
  async (_get, set, sizes: Record<string, CollageSizeClass>, context: string = "nfts") => {
    set(collageSizesAtom, sizes)
    try {
      await authFetch(`/api/user/sizes/${context}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sizes),
      })
    } catch {
      // Ignore errors - user might not be authenticated
    }
  }
)

// Collage order - stored in user DO
export const collageOrderAtom = atom<string[]>([])

export const fetchCollageOrderAtom = atom(null, async (_get, set, context: string = "nfts") => {
  try {
    const res = await authFetch(`/api/user/order/${context}`)
    if (res.ok) {
      const data = (await res.json()) as Record<string, number> | string[]
      if (Array.isArray(data)) {
        set(collageOrderAtom, data)
      } else {
        // Convert old format (mint -> index) to new format (ordered array)
        const entries = Object.entries(data)
        entries.sort((a, b) => a[1] - b[1])
        set(
          collageOrderAtom,
          entries.map(([mint]) => mint)
        )
      }
    }
  } catch {
    // Ignore errors - user might not be authenticated
  }
})

export const saveCollageOrderAtom = atom(null, async (_get, set, order: string[], context: string = "nfts") => {
  set(collageOrderAtom, order)
  try {
    await authFetch(`/api/user/order/${context}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    })
  } catch {
    // Ignore errors - user might not be authenticated
  }
})

// Actions
export const toggleStarredAtom = atom(null, (get, set, mint: string) => {
  const starred = get(starredAtom)
  const next = new Set(starred)
  if (next.has(mint)) {
    next.delete(mint)
  } else {
    next.add(mint)
  }
  set(starredAtom, next)
})

export const toggleJunkAtom = atom(null, (get, set, mint: string) => {
  const junk = get(junkAtom)
  const next = new Set(junk)
  if (next.has(mint)) {
    next.delete(mint)
  } else {
    next.add(mint)
  }
  set(junkAtom, next)
})

export const addTagAtom = atom(null, (_get, set, tag: Omit<Tag, "id">) => {
  const id = crypto.randomUUID()
  set(tagsAtom, (prev) => [...prev, { ...tag, id }])
  return id
})

export const removeTagAtom = atom(null, (_get, set, tagId: string) => {
  set(tagsAtom, (prev) => prev.filter((t) => t.id !== tagId))
  set(nftTagsAtom, (prev) => {
    const next: Record<string, string[]> = {}
    for (const [mint, tags] of Object.entries(prev)) {
      const filtered = tags.filter((t) => t !== tagId)
      if (filtered.length > 0) next[mint] = filtered
    }
    return next
  })
})

export const toggleNftTagAtom = atom(null, (_get, set, { mint, tagId }: { mint: string; tagId: string }) => {
  set(nftTagsAtom, (prev) => {
    const tags = prev[mint] ?? []
    const hasTag = tags.includes(tagId)
    if (hasTag) {
      const filtered = tags.filter((t) => t !== tagId)
      if (filtered.length === 0) {
        const { [mint]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [mint]: filtered }
    }
    return { ...prev, [mint]: [...tags, tagId] }
  })
})
