import { v4 as uuid } from "uuid"
import { FC, createContext, useContext, useEffect, useState } from "react"
import { useDatabase } from "./database"
import { useLiveQuery } from "dexie-react-hooks"
import { noop, toPairs } from "lodash"
import { useRouter } from "next/router"
import { Tag } from "../db"
import { toast } from "react-hot-toast"
import { useAccess } from "./access"

type TagsContextProps = {
  tags: Tag[]
  tag: Tag | null
  starredNfts: string[]
  addTag: Function
  updateTag: Function
  deleteTag: Function
  addNftsToTag: Function
  removeNftsFromTag: Function
  addNftToStarred: Function
  removeNftFromStarred: Function
}

const initial: TagsContextProps = {
  tags: [],
  tag: null,
  starredNfts: [],
  addTag: noop,
  updateTag: noop,
  deleteTag: noop,
  addNftsToTag: noop,
  removeNftsFromTag: noop,
  addNftToStarred: noop,
  removeNftFromStarred: noop,
}

const TagsContext = createContext<TagsContextProps>(initial)

type TagsProviderProps = {
  children: JSX.Element
}

export const TagsProvider: FC<TagsProviderProps> = ({ children }) => {
  const { db } = useDatabase()
  const router = useRouter()
  const [tag, setTag] = useState<Tag | null>(null)
  const { userId } = useAccess()
  const tags =
    useLiveQuery(() => db.tags.filter((t) => t.userId === userId && t.id !== "starred").toArray(), [userId], []) || []

  const starredNfts = useLiveQuery(() => db.taggedNfts.where({ tagId: "starred" }).toArray(), [], []).map(
    (n) => n.nftId
  )

  async function migrate() {
    if (!userId) {
      return
    }
    const toMigrate = tags.filter((t) => !t.userId)
    console.log({ toMigrate })

    if (!toMigrate.length) {
      return
    }

    await db.tags.bulkUpdate(
      toMigrate.map((item) => {
        return {
          key: item.id,
          changes: {
            userId,
          },
        }
      })
    )
  }

  useEffect(() => {
    migrate()
  }, [userId])

  async function addTag(name: string, color: string) {
    if (!userId) {
      throw new Error("User account not found")
    }
    const id = await db.tags.add({
      name,
      color,
      id: uuid(),
      userId,
    })

    return id
  }

  async function addNftToStarred(mint: string) {
    if (!userId) {
      throw new Error("User account not found")
    }
    await db.transaction("rw", db.tags, db.taggedNfts, async () => {
      const tag = await db.tags.get("starred")
      if (!tag) {
        await db.tags.add({ id: "starred", name: "Starred", userId })
      }
      await db.taggedNfts.put({ tagId: "starred", nftId: mint })
    })
  }

  async function removeNftFromStarred(mint: string) {
    if (!userId) {
      throw new Error("User account not found")
    }
    await db.taggedNfts.where({ tagId: "starred", nftId: mint }).delete()
  }

  async function updateTag(id: string, name: string, color: string) {
    if (!userId) {
      throw new Error("User account not found")
    }
    await db.tags.update(id, { name, color })
  }

  async function addNftsToTag(tagId: string, nftMints: string[]) {
    if (!tagId || !nftMints.length || !userId) {
      toast.error("Missing params")
      return
    }
    await db.taggedNfts.bulkPut(
      nftMints.map((nftId) => {
        return {
          nftId,
          tagId,
        }
      })
    )
  }

  async function removeNftsFromTag(tagId: string, nftMints: string[]) {
    if (!tagId || !nftMints.length || !userId) {
      toast.error("Missing params")
      return
    }
    await db.taggedNfts
      .where({ tagId })
      .and((item) => nftMints.includes(item.nftId))
      .delete()
  }

  async function deleteTag(tagId: string) {
    if (!userId) {
      throw new Error("User not found")
    }
    await db.transaction("rw", db.tags, db.taggedNfts, async () => {
      await db.taggedNfts.where({ tagId }).delete()
      await db.tags.where({ id: tagId }).delete()
    })
  }

  useEffect(() => {
    if (!tags.length || !router.query.tag || router.query.tag === "untagged") {
      setTag(null)
      return
    }
    const tag = tags.find((t) => t.id === router.query.tag)
    if (tag) {
      setTag(tag)
    } else {
      setTag(null)
    }
  }, [tags, router.query.tag])

  return (
    <TagsContext.Provider
      value={{
        addTag,
        updateTag,
        deleteTag,
        addNftsToTag,
        removeNftsFromTag,
        tags,
        tag,
        addNftToStarred,
        removeNftFromStarred,
        starredNfts,
      }}
    >
      {children}
    </TagsContext.Provider>
  )
}

export const useTags = () => {
  return useContext(TagsContext)
}
