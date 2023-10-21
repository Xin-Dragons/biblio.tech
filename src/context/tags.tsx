// "use client"
// import { v4 as uuid } from "uuid"
// import { FC, createContext, useContext, useEffect, useState } from "react"
// import { useDatabase } from "./database"
// import { useLiveQuery } from "dexie-react-hooks"
// import { noop, toPairs } from "lodash"
// import { useRouter } from "next/router"
// import { Tag } from "../db"
// import { toast } from "react-hot-toast"
// import { useAccess } from "./access"
// import { useWallet } from "@solana/wallet-adapter-react"

// type TagsContextProps = {
//   tags: Tag[]
//   starredNfts: string[]
//   addTag: Function
//   updateTag: Function
//   deleteTag: Function
//   addNftsToTag: Function
//   removeNftsFromTag: Function
//   addNftToStarred: Function
//   removeNftFromStarred: Function
// }

// const initial: TagsContextProps = {
//   tags: [],
//   starredNfts: [],
//   addTag: noop,
//   updateTag: noop,
//   deleteTag: noop,
//   addNftsToTag: noop,
//   removeNftsFromTag: noop,
//   addNftToStarred: noop,
//   removeNftFromStarred: noop,
// }

// const TagsContext = createContext<TagsContextProps>(initial)

// type TagsProviderProps = {
//   children: JSX.Element
// }

// export const TagsProvider: FC<TagsProviderProps> = ({ children }) => {
//   const { db } = useDatabase()
//   const { userId } = useAccess()
//   const wallet = useWallet()
//   const tags =
//     useLiveQuery(() => db.tags.filter((t) => t.userId === userId && t.id !== "starred").toArray(), [userId], []) || []

//   const starredNfts = useLiveQuery(() => db.taggedNfts.where({ tagId: "starred" }).toArray(), [], []).map(
//     (n) => n.nftId
//   )

//   async function migrate() {
//     if (!userId) {
//       return
//     }
//     const toMigrate = tags.filter((t) => !t.userId)

//     if (!toMigrate.length) {
//       return
//     }

//     await db.tags.bulkUpdate(
//       toMigrate.map((item) => {
//         return {
//           key: item.id,
//           changes: {
//             userId,
//           },
//         }
//       })
//     )
//   }

//   useEffect(() => {
//     migrate()
//   }, [userId])

//   async function addTag(name: string, color: string) {
//     const uid = userId || (wallet.publicKey?.toBase58() as string)
//     const id = await db.tags.add({
//       name,
//       color,
//       id: uuid(),
//       userId: uid,
//     })

//     return id
//   }

//   async function addNftToStarred(mint: string) {
//     const uid = userId || (wallet.publicKey?.toBase58() as string)
//     await db.transaction("rw", db.tags, db.taggedNfts, async () => {
//       const tag = await db.tags.get("starred")
//       if (!tag) {
//         await db.tags.add({ id: "starred", name: "Starred", userId: uid })
//       }
//       await db.taggedNfts.put({ tagId: "starred", nftId: mint })
//     })
//   }

//   async function removeNftFromStarred(mint: string) {
//     await db.taggedNfts.where({ tagId: "starred", nftId: mint }).delete()
//   }

//   async function updateTag(id: string, name: string, color: string) {
//     await db.tags.update(id, { name, color })
//   }

//   async function addNftsToTag(tagId: string, nftMints: string[]) {
//     if (!tagId || !nftMints.length) {
//       toast.error("Missing params")
//       return
//     }
//     await db.taggedNfts.bulkPut(
//       nftMints.map((nftId) => {
//         return {
//           nftId,
//           tagId,
//         }
//       })
//     )
//   }

//   async function removeNftsFromTag(tagId: string, nftMints: string[]) {
//     if (!tagId || !nftMints.length) {
//       toast.error("Missing params")
//       return
//     }
//     await db.taggedNfts
//       .where({ tagId })
//       .and((item) => nftMints.includes(item.nftId))
//       .delete()
//   }

//   async function deleteTag(tagId: string) {
//     await db.transaction("rw", db.tags, db.taggedNfts, async () => {
//       await db.taggedNfts.where({ tagId }).delete()
//       await db.tags.where({ id: tagId }).delete()
//     })
//   }

//   return (
//     <TagsContext.Provider
//       value={{
//         addTag,
//         updateTag,
//         deleteTag,
//         addNftsToTag,
//         removeNftsFromTag,
//         tags,
//         addNftToStarred,
//         removeNftFromStarred,
//         starredNfts,
//       }}
//     >
//       {children}
//     </TagsContext.Provider>
//   )
// }

// export const useTags = () => {
//   const context = useContext(TagsContext)

//   if (context === undefined) {
//     throw new Error("useTags must be used in a TagsProvider")
//   }

//   return context
// }
