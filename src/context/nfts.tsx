// // "use client"
// // import { useLiveQuery } from "dexie-react-hooks"
// // import { createContext, useContext, useState } from "react"
// // import { useDatabase } from "./database"
// // import { useAccess } from "./access"
// // import { useUiSettings } from "./ui-settings"
// // import { useParams } from "next/navigation"
// // import { useFilters } from "./filters"

// // const Context = createContext()

// // export function NftsProvider({ children }) {
// //   const { db } = useDatabase()
// //   const [nfts, setNfts] = useState([])
// //   const { showAllWallets, loanType } = useUiSettings()
// //   const params = useParams()
// //   const { showStarred, showLoans, showUntagged, search, selectedTags } = useFilters()
// //   const { publicKey, userId, publicKeys, isAdmin } = useAccess()

// //   const nftsFromDb = useLiveQuery(
// //     () => {
// //       const query =
// //         showAllWallets && isAdmin ? db.nfts.where("owner").anyOf(publicKeys) : db.nfts.where({ owner: publicKey })
// //       if (filter === "loans") {
// //         if (loanType === "borrowed") {
// //           return query
// //             .filter((item) => Boolean(item.loan && item.loan.status === "active" && item.status === "loan-taken"))
// //             .toArray()
// //         } else {
// //           const pks = showAllWallets && isAdmin ? publicKeys : [publicKey]
// //           return db.nfts.filter((item) => pks.includes(item.loan?.lender!)).toArray()
// //         }
// //       }
// //       if (filter === "sfts") {
// //         return query.filter((item) => item.metadata.tokenStandard === 1).toArray()
// //       }
// //       if (filter === "starred") {
// //         return query.filter((item) => starredNfts.map((n) => n.nftId).includes(item.nftMint)).toArray()
// //       }
// //       if (filter === "spl") {
// //         return query.filter((item) => item.metadata.tokenStandard === 2).toArray()
// //       }
// //       if (filter === "editions") {
// //         return query.filter((item) => item.metadata.tokenStandard === 3).toArray()
// //       }
// //       if (filter === "nfts") {
// //         return query.filter((item) => [0, null, 4].includes(item.metadata.tokenStandard)).toArray()
// //       }
// //       if (filter === "vault") {
// //         return query.filter((item) => item.status === "inVault").toArray()
// //       }
// //       if (filter === "listings") {
// //         return query.filter((item) => item.status === "listed").toArray()
// //       }
// //       if (!filter && !collectionId && !tag) {
// //         return query.filter((item) => [0, 4, 5].includes(item.metadata.tokenStandard!)).toArray()
// //       }
// //       if (filter === "junk") {
// //         return query
// //           .filter((item) =>
// //             Boolean(
// //               // things on HR or MR probably aren't junk
// //               !rarity.find((r) => r.nftMint === item.nftMint) &&
// //                 // things categorised by HM prob aren't junk
// //                 !item.helloMoonCollectionId &&
// //                 // we dont know about these yet
// //                 item.jsonLoaded &&
// //                 // frozen things are probably cool
// //                 !item.status &&
// //                 // things that have a value aren't junk
// //                 !item.price &&
// //                 // NFT editions probably aren't junk
// //                 item.metadata.tokenStandard !== 3 &&
// //                 // missing json probably junk
// //                 (!item.json ||
// //                   // website in description is probably junk
// //                   (item.json.description || "").match(
// //                     /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
// //                   ) ||
// //                   // includes junk words - probably junk
// //                   [
// //                     "whitelist",
// //                     "invited",
// //                     "upgrade",
// //                     "reward",
// //                     "free",
// //                     "reveal here",
// //                     "upgrade here",
// //                     "mystery box",
// //                     "claim",
// //                     "exchange here",
// //                     "airdrop",
// //                     "mystery",
// //                   ].some((trigger) => (item?.json?.description || "").toLowerCase().includes(trigger)))
// //             )
// //           )
// //           .toArray()
// //       }
// //       if (tag) {
// //         if (tag === "untagged") {
// //           return query.filter((item) => !allTaggedNfts.map((t) => t.nftId).includes(item.nftMint)).toArray()
// //         }
// //         return query.filter((item) => taggedNfts.map((t) => t.nftId).includes(item.nftMint)).toArray()
// //       }
// //       if (collectionId) {
// //         if (collectionId === "uncategorized") {
// //           return query
// //             .filter(
// //               (item) =>
// //                 [0, 4, 5].includes(item.metadata.tokenStandard!) &&
// //                 !item.collectionId &&
// //                 !item.helloMoonCollectionId &&
// //                 allNFts.filter((n) => n.firstVerifiedCreator === item.firstVerifiedCreator).length === 1
// //             )
// //             .toArray()
// //         }
// //         return query.filter((item) => item.collectionIdentifier === collectionId).toArray()
// //       }
// //       return []
// //     },
// //     [publicKey, showStarred, sort, params, taggedNfts, allNFts, publicKeys, showAllWallets, loanType],
// //     []
// //   )

// //   return <Context.Provider value={{ nfts, filtered: nfts }}>{children}</Context.Provider>
// // }

// // export const useNfts = () => {
// //   return useContext(Context)
// // }

// "use client"
// import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
// import { useDatabase } from "./database"
// import { useLiveQuery } from "dexie-react-hooks"
// import { useUiSettings } from "./ui-settings"
// import { useFilters } from "./filters"
// import { useAccess } from "./access"
// import { orderBy, sortBy } from "lodash"
// import { base58PublicKey } from "@metaplex-foundation/umi"
// import { Nft, Rarity } from "../db"
// import { useParams, usePathname } from "next/navigation"

// type NftsContextProps = {
//   nfts: any[]
//   tags: any[]
//   taggedNfts: any[]
//   filtered: any[]
//   loading: boolean
//   rarity: Rarity[]
//   // allNfts: any[]
// }

// const initial = {
//   nfts: [],
//   tags: [],
//   taggedNfts: [],
//   filtered: [],
//   loading: false,
//   rarity: [],
//   // allNfts: [],
// }

// export const NftsContext = createContext<NftsContextProps>(initial)

// type NftsProviderProps = {
//   children: ReactNode
// }

// export const NftsProvider: FC<NftsProviderProps> = ({ children }) => {
//   const { filter, collectionId, tag } = useParams()
//   const path = usePathname()
//   const { publicKey, userId, publicKeys, isAdmin } = useAccess()
//   const { sort, showAllWallets, loanType } = useUiSettings()
//   const { showStarred, showLoans, showUntagged, search, selectedTags } = useFilters()
//   const [nfts, setNfts] = useState<Nft[]>([])

//   const { db } = useDatabase()
//   const tags = useLiveQuery(() => db.tags.filter((t) => t.id !== "starred").toArray(), [], [])
//   const taggedNfts = useLiveQuery(
//     () => db.taggedNfts.filter((item) => tag === "untagged" || !tag || item.tagId === tag).toArray(),
//     [tag],
//     []
//   )

//   const allTaggedNfts = useLiveQuery(() => db.taggedNfts.filter((item) => item.tagId !== "starred").toArray(), [], [])

//   const starredNfts = useLiveQuery(() => db.taggedNfts.where({ tagId: "starred" }).toArray(), [], [])

//   const order = useLiveQuery(() => db.order.toArray(), [], [])
//   const allNfts = useLiveQuery(() => db.nfts.toArray(), [], [])

//   const rarity = useLiveQuery(
//     () =>
//       db.rarity
//         // .where("nftMint")
//         // .anyOf(nfts.map((n) => n.nftMint))
//         .filter((r) => Boolean(r.howRare || r.moonRank))
//         .toArray(),
//     [],
//     []
//   )

//   const nftsFromDb = useLiveQuery(
//     () => {
//       const query =
//         showAllWallets && isAdmin ? db.nfts.where("owner").anyOf(publicKeys) : db.nfts.where({ owner: publicKey })
//       if (filter === "loans") {
//         if (loanType === "borrowed") {
//           return query
//             .filter((item) => Boolean(item.loan && item.loan.status === "active" && item.status === "loan-taken"))
//             .toArray()
//         } else {
//           const pks = showAllWallets && isAdmin ? publicKeys : [publicKey]
//           return db.nfts.filter((item) => pks.includes(item.loan?.lender!)).toArray()
//         }
//       }
//       if (filter === "sfts") {
//         return query.filter((item) => item.metadata.tokenStandard === 1).toArray()
//       }
//       if (filter === "starred") {
//         return query.filter((item) => starredNfts.map((n) => n.nftId).includes(item.nftMint)).toArray()
//       }
//       if (filter === "spl") {
//         return query.filter((item) => item.metadata.tokenStandard === 2).toArray()
//       }
//       if (filter === "editions") {
//         return query.filter((item) => item.metadata.tokenStandard === 3).toArray()
//       }
//       if (filter === "nfts") {
//         return query.filter((item) => [0, null, 4].includes(item.metadata.tokenStandard)).toArray()
//       }
//       if (filter === "vault") {
//         return query.filter((item) => item.status === "inVault").toArray()
//       }
//       if (filter === "listings") {
//         return query.filter((item) => item.status === "listed").toArray()
//       }
//       if (!filter && !collectionId && !tag) {
//         return query.filter((item) => [0, 4, 5].includes(item.metadata.tokenStandard!)).toArray()
//       }
//       if (filter === "junk") {
//         return query
//           .filter((item) =>
//             Boolean(
//               // things on HR or MR probably aren't junk
//               !rarity.find((r) => r.nftMint === item.nftMint) &&
//                 // things categorised by HM prob aren't junk
//                 !item.helloMoonCollectionId &&
//                 // we dont know about these yet
//                 item.jsonLoaded &&
//                 // frozen things are probably cool
//                 !item.status &&
//                 // things that have a value aren't junk
//                 !item.price &&
//                 // NFT editions probably aren't junk
//                 item.metadata.tokenStandard !== 3 &&
//                 // missing json probably junk
//                 (!item.json ||
//                   // website in description is probably junk
//                   (item.json.description || "").match(
//                     /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
//                   ) ||
//                   // includes junk words - probably junk
//                   [
//                     "whitelist",
//                     "invited",
//                     "upgrade",
//                     "reward",
//                     "free",
//                     "reveal here",
//                     "upgrade here",
//                     "mystery box",
//                     "claim",
//                     "exchange here",
//                     "airdrop",
//                     "mystery",
//                   ].some((trigger) => (item?.json?.description || "").toLowerCase().includes(trigger)))
//             )
//           )
//           .toArray()
//       }
//       if (tag) {
//         if (tag === "untagged") {
//           return query.filter((item) => !allTaggedNfts.map((t) => t.nftId).includes(item.nftMint)).toArray()
//         }
//         return query.filter((item) => taggedNfts.map((t) => t.nftId).includes(item.nftMint)).toArray()
//       }
//       if (collectionId) {
//         if (collectionId === "uncategorized") {
//           return query
//             .filter(
//               (item) =>
//                 [0, 4, 5].includes(item.metadata.tokenStandard!) &&
//                 !item.collectionId &&
//                 !item.helloMoonCollectionId &&
//                 allNfts.filter((n) => n.firstVerifiedCreator === item.firstVerifiedCreator).length === 1
//             )
//             .toArray()
//         }
//         return query.filter((item) => item.collectionIdentifier === collectionId).toArray()
//       }
//       return []
//     },
//     [publicKey, showStarred, sort, path, taggedNfts, publicKeys, showAllWallets, loanType, allNfts],
//     []
//   )

//   useEffect(() => {
//     setNfts(nftsFromDb)
//   }, [nftsFromDb])

//   useEffect(() => {
//     setNfts([])
//   }, [path, publicKey])

//   // if (collections.length && nfts.find((n) => !n.helloMoonCollectionId)) {
//   //   collections.push({
//   //     id: 'unknown',
//   //     name: 'Unknown collection',
//   //     nfts: nfts.filter((n) => !n.helloMoonCollectionId),
//   //     value: 0,
//   //   });
//   // }

//   // const nfts = (
//   //   useLiveQuery(
//   //     () =>
//   //       db &&
//   //       db.nfts
//   //         .where('nftMint')
//   //         .anyOf(loans.map((l) => l.nftMint))
//   //         .sortBy(sort),
//   //     [db, wallet.publicKey, loans, sort],
//   //     []
//   //   ) || []
//   // ).map((nft) => {
//   //   const loan = loans.find((l) => l.nftMint === nft.nftMint);
//   //   if (!loan) {
//   //     return nft;
//   //   }
//   //   return {
//   //     ...nft,
//   //     amount: loan.amountToRepay,
//   //     duration: loan.duration,
//   //   };
//   // });

//   let filtered: Nft[] = (nfts || [])
//     .filter((nft) => !showStarred || starredNfts.map((n) => n.nftId).includes(nft.nftMint))
//     .filter((nft) => !showUntagged || !allTaggedNfts.map((t) => t.nftId).includes(nft.nftMint))
//     .filter((nft) => !showLoans || nft.loan)
//     .filter((nft) => {
//       if (!selectedTags.length) {
//         return true
//       }
//       return taggedNfts
//         .filter((t) => selectedTags.includes(t.tagId))
//         .map((t) => t.nftId)
//         .includes(nft.nftMint)
//     })
//     .filter((nft) => {
//       if (!search) {
//         return true
//       }

//       const s = search.toLowerCase()
//       let name = nft.json?.name || nft.metadata.name || ""
//       if (typeof name !== "string") {
//         name = `${name}`
//       }
//       const symbol = nft.json?.symbol || nft.metadata.symbol || ""
//       const description = nft.json?.description || ""

//       if (s.includes("traits:")) {
//         const num = parseInt(s.split(":")[1])
//         if (num) {
//           return (
//             nft.json?.attributes?.filter(
//               (att) => att && att.value !== "none" && att.value !== "None" && att.value !== "NONE"
//             ).length === num
//           )
//         }
//       }

//       if (s.includes(":")) {
//         const [trait_type, value] = s.split(":").map((item) => item.trim().toLocaleLowerCase())
//         if (trait_type && value) {
//           return (
//             nft.json?.attributes?.find((att) => att?.trait_type?.toLowerCase() === trait_type)?.value?.toLowerCase() ===
//             value
//           )
//         }
//       }

//       const values = (nft.json?.attributes || []).map((att: any) => `${att?.value || ""}`.toLowerCase())
//       return (
//         nft.nftMint === search ||
//         nft.status === s ||
//         name.toLowerCase().includes(s) ||
//         description.toLowerCase().includes(s) ||
//         symbol.toLowerCase().includes(s) ||
//         values.some((val: any) => val.includes(s))
//       )
//     })

//   if (sort === "name") {
//     filtered = sortBy(filtered, (item) => (item.json ? item.json.name : item.metadata.name))
//   }

//   if (sort === "howRare") {
//     filtered = sortBy(filtered, (item) => rarity.find((r) => r.nftMint === item.nftMint)?.howRare)
//   }

//   if (sort === "moonRank") {
//     filtered = sortBy(filtered, (item) => rarity.find((r) => r.nftMint === item.nftMint)?.moonRank)
//   }

//   if (sort === "howRareDesc") {
//     filtered = sortBy(filtered, (item) => rarity.find((r) => r.nftMint === item.nftMint)?.howRare).reverse()
//   }

//   if (sort === "moonRankDesc") {
//     filtered = sortBy(filtered, (item) => rarity.find((r) => r.nftMint === item.nftMint)?.moonRank).reverse()
//   }

//   if (sort === "background") {
//     filtered = sortBy(filtered, (item) => {
//       const bg = item.json?.attributes?.find((att) => att.trait_type?.toLowerCase() === "background")?.value
//       return bg
//     })
//   }

//   if (sort === "outstanding") {
//     filtered = orderBy(filtered, (item) => item.loan?.amountToRepay || 0, "desc")
//   }

//   if (sort === "value") {
//     filtered = orderBy(
//       filtered,
//       (item) => {
//         const balance =
//           (isAdmin && showAllWallets
//             ? publicKeys.reduce((sum, pk) => sum + (item.balance?.[pk as keyof object] || 0), 0)
//             : item.balance?.[publicKey as keyof object]) || 0

//         const price = item.price || 0
//         const value = price * balance
//         return value || 0
//       },
//       "desc"
//     )
//   }

//   if (sort === "expiring") {
//     filtered = sortBy(filtered, (item) => item.loan?.defaults || 0)
//   }

//   if (sort === "balance") {
//     filtered = sortBy(filtered, (item) => {
//       const balance =
//         (isAdmin && showAllWallets
//           ? publicKeys.reduce((sum, pk) => sum + (item.balance?.[pk as keyof object] || 0), 0)
//           : item.balance?.[publicKey as keyof object]) || 0
//       return balance
//     }).reverse()
//   }

//   if (sort === "creator") {
//     filtered = sortBy(filtered, [
//       (item) => {
//         const creator = item.metadata.creators?.find((c: any) => c.verified)?.address
//         return creator ? base58PublicKey(creator) : null
//       },
//       "name",
//     ])
//   }

//   if (sort === "custom") {
//     let key: string
//     if (filter) {
//       key = filter as string
//     } else if (collectionId) {
//       key = collectionId as string
//     } else if (tag) {
//       key = tag as string
//     }
//     filtered = sortBy(filtered, (item) => order.find((i) => i.nftMint === item.nftMint)?.[key as keyof object])
//   }

//   if (sort.includes("attribute")) {
//     const attribute = sort.replace("attribute.", "").toLowerCase()
//     filtered = sortBy(filtered, (item) => {
//       const bg = item.json?.attributes?.find((att) => att?.trait_type?.toLowerCase() === attribute)?.value
//       return bg
//     })
//   }

//   return (
//     <NftsContext.Provider
//       value={{
//         nfts: nfts || [],
//         tags,
//         taggedNfts,
//         filtered,
//         loading: !nfts,
//         rarity,
//         // allNfts,
//       }}
//     >
//       {children}
//     </NftsContext.Provider>
//   )
// }

// export const useNfts = () => {
//   const context = useContext(NftsContext)

//   if (context === undefined) {
//     throw new Error("useNfts must be used in a NftsProvider")
//   }

//   return context
// }
