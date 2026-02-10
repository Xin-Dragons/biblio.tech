import { atom } from "jotai"
import { atomWithStorage, createJSONStorage } from "jotai/utils"
import { API_BASE } from "@/lib/api"

export const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const

export type PresetColor = (typeof PRESET_COLORS)[number]

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

// Derived atom for tag NFT counts - computed once, used everywhere
export const tagNftCountsAtom = atom((get) => {
  const nftTags = get(nftTagsAtom)
  const counts: Record<string, number> = {}
  for (const tagIds of Object.values(nftTags)) {
    for (const tagId of tagIds) {
      counts[tagId] = (counts[tagId] ?? 0) + 1
    }
  }
  return counts
})

// Loading state for tags (to avoid flash of empty state)
export const tagsLoadingAtom = atom(false)

// Fetch tags from API - called on authenticated app load
export const fetchTagsAtom = atom(null, async (_get, set) => {
  set(tagsLoadingAtom, true)
  try {
    const res = await authFetch(`${API_BASE}/user/tags`)
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
    const res = await authFetch(`${API_BASE}/user/nft-tags`)
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
    const res = await authFetch(`${API_BASE}/user/layout/${context}`)
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
      await authFetch(`${API_BASE}/user/layout/${context}`, {
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
    const res = await authFetch(`${API_BASE}/user/sizes/${context}`)
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
      await authFetch(`${API_BASE}/user/sizes/${context}`, {
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
    const res = await authFetch(`${API_BASE}/user/order/${context}`)
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
    await authFetch(`${API_BASE}/user/order/${context}`, {
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

// Create tag via API with optimistic update
export const createTagAtom = atom(null, async (get, set, tag: Omit<Tag, "id">) => {
  const id = crypto.randomUUID()
  const newTag: Tag = { ...tag, id }

  // Optimistic update
  const prevTags = get(tagsAtom)
  set(tagsAtom, [...prevTags, newTag])

  try {
    const res = await authFetch(`${API_BASE}/user/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTag),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Failed to create tag" }))
      throw new Error((errorData as { error?: string }).error ?? "Failed to create tag")
    }
    return newTag
  } catch (err) {
    // Rollback on error
    set(tagsAtom, prevTags)
    throw err
  }
})

// Update tag via API with optimistic update
export const updateTagAtom = atom(
  null,
  async (get, set, { id, updates }: { id: string; updates: Partial<{ name: string; color: string }> }) => {
    const prevTags = get(tagsAtom)
    const tagIndex = prevTags.findIndex((t) => t.id === id)
    if (tagIndex === -1) throw new Error("Tag not found")

    // Optimistic update
    const updatedTag = { ...prevTags[tagIndex], ...updates }
    const newTags = [...prevTags]
    newTags[tagIndex] = updatedTag
    set(tagsAtom, newTags)

    try {
      const res = await authFetch(`${API_BASE}/user/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to update tag" }))
        throw new Error((errorData as { error?: string }).error ?? "Failed to update tag")
      }
      return updatedTag
    } catch (err) {
      // Rollback on error
      set(tagsAtom, prevTags)
      throw err
    }
  }
)

// Delete tag via API with optimistic update
export const deleteTagAtom = atom(null, async (get, set, tagId: string) => {
  const prevTags = get(tagsAtom)
  const prevNftTags = get(nftTagsAtom)

  // Optimistic update
  set(
    tagsAtom,
    prevTags.filter((t) => t.id !== tagId)
  )
  const nextNftTags: Record<string, string[]> = {}
  for (const [mint, tags] of Object.entries(prevNftTags)) {
    const filtered = tags.filter((t) => t !== tagId)
    if (filtered.length > 0) nextNftTags[mint] = filtered
  }
  set(nftTagsAtom, nextNftTags)

  try {
    const res = await authFetch(`${API_BASE}/user/tags/${tagId}`, { method: "DELETE" })
    if (!res.ok && res.status !== 404) {
      throw new Error("Failed to delete tag")
    }
  } catch (err) {
    // Rollback on error
    set(tagsAtom, prevTags)
    set(nftTagsAtom, prevNftTags)
    throw err
  }
})

// Bulk update NFT-tag associations via API with optimistic update
export const bulkUpdateNftTagsAtom = atom(
  null,
  async (get, set, { tagId, add, remove }: { tagId: string; add?: string[]; remove?: string[] }) => {
    const prevNftTags = get(nftTagsAtom)

    // Optimistic update
    const nextNftTags = { ...prevNftTags }
    if (add) {
      for (const mint of add) {
        const current = nextNftTags[mint] ?? []
        if (!current.includes(tagId)) {
          nextNftTags[mint] = [...current, tagId]
        }
      }
    }
    if (remove) {
      for (const mint of remove) {
        const current = nextNftTags[mint] ?? []
        const filtered = current.filter((t) => t !== tagId)
        if (filtered.length === 0) {
          delete nextNftTags[mint]
        } else {
          nextNftTags[mint] = filtered
        }
      }
    }
    set(nftTagsAtom, nextNftTags)

    try {
      const body: { add?: string[]; remove?: string[] } = {}
      if (add && add.length > 0) body.add = add
      if (remove && remove.length > 0) body.remove = remove

      const res = await authFetch(`${API_BASE}/user/tags/${tagId}/nfts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error("Failed to update tag associations")
      }
    } catch (err) {
      // Rollback on error
      set(nftTagsAtom, prevNftTags)
      throw err
    }
  }
)
