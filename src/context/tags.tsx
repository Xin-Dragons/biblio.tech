import { v4 as uuid } from "uuid"
import { FC, createContext, useContext, useEffect, useState } from "react"
import { useDatabase } from "./database"
import { useLiveQuery } from "dexie-react-hooks"
import { noop, toPairs } from "lodash"
import { useRouter } from "next/router"
import { Tag } from "../db"
import { toast } from "react-hot-toast"
import { useAccess } from "./access"
import { useWallet } from "@solana/wallet-adapter-react"

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
  const { user } = useAccess()
  const wallet = useWallet()
  const tags =
    useLiveQuery(() => db.tags.filter((t) => t.userId === user.id && t.id !== "starred").toArray(), [user.id], []) || []

  const starredNfts = useLiveQuery(() => db.taggedNfts.where({ tagId: "starred" }).toArray(), [], []).map(
    (n) => n.nftId
  )

  async function migrate() {
    if (!user.id) {
      return
    }
    const toMigrate = tags.filter((t) => !t.userId)

    if (!toMigrate.length) {
      return
    }

    await db.tags.bulkUpdate(
      toMigrate.map((item) => {
        return {
          key: item.id,
          changes: {
            userId: user.id,
          },
        }
      })
    )
  }

  useEffect(() => {
    migrate()
  }, [user.id])

  async function addTag(name: string, color: string) {
    const uid = user.id || (wallet.publicKey?.toBase58() as string)
    const id = await db.tags.add({
      name,
      color,
      id: uuid(),
      userId: uid,
    })

    return id
  }

  async function addNftToStarred(mint: string) {
    const uid = user.id || (wallet.publicKey?.toBase58() as string)
    await db.transaction("rw", db.tags, db.taggedNfts, async () => {
      const tag = await db.tags.get("starred")
      if (!tag) {
        await db.tags.add({ id: "starred", name: "Starred", userId: uid })
      }
      await db.taggedNfts.put({ tagId: "starred", nftId: mint })
    })
  }

  async function removeNftFromStarred(mint: string) {
    await db.taggedNfts.where({ tagId: "starred", nftId: mint }).delete()
  }

  async function updateTag(id: string, name: string, color: string) {
    await db.tags.update(id, { name, color })
  }

  async function addNftsToTag(tagId: string, nftMints: string[]) {
    if (!tagId || !nftMints.length) {
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
    if (!tagId || !nftMints.length) {
      toast.error("Missing params")
      return
    }
    await db.taggedNfts
      .where({ tagId })
      .and((item) => nftMints.includes(item.nftId))
      .delete()
  }

  async function deleteTag(tagId: string) {
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
