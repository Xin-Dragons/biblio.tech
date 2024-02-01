import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useDatabase } from "./database"
import { useLiveQuery } from "dexie-react-hooks"
import { useUiSettings } from "./ui-settings"
import { useFilters } from "./filters"
import { useRouter } from "next/router"
import { useAccess } from "./access"
import { orderBy, sortBy } from "lodash"
import { base58PublicKey } from "@metaplex-foundation/umi"
import { Nft, Rarity } from "../db"

type NftsContextProps = {
  nfts: Nft[]
  tags: any[]
  taggedNfts: any[]
  filtered: Nft[]
  loading: boolean
  rarity: Rarity[]
  allNfts: any[]
}

const initial = {
  nfts: [],
  tags: [],
  taggedNfts: [],
  filtered: [],
  loading: false,
  rarity: [],
  allNfts: [],
}

export const NftsContext = createContext<NftsContextProps>(initial)

type NftsProviderProps = {
  children: ReactNode
}

export const NftsProvider: FC<NftsProviderProps> = ({ children }) => {
  const router = useRouter()
  const { publicKey, publicKeys } = useAccess()
  const { sort, showAllWallets, loanType } = useUiSettings()
  const { showStarred, showLoans, showUntagged, search, selectedTags } = useFilters()
  const {} = useFilters()
  const [nfts, setNfts] = useState<Nft[]>([])

  const { db } = useDatabase()
  const tags = useLiveQuery(() => db.tags.filter((t) => t.id !== "starred").toArray(), [], [])
  const taggedNfts = useLiveQuery(
    () =>
      db.taggedNfts
        .filter((item) => router.query.tag === "untagged" || !router.query.tag || item.tagId === router.query.tag)
        .toArray(),
    [router.query.tag],
    []
  )

  const allTaggedNfts = useLiveQuery(() => db.taggedNfts.filter((item) => item.tagId !== "starred").toArray(), [], [])

  const starredNfts = useLiveQuery(() => db.taggedNfts.where({ tagId: "starred" }).toArray(), [], [])

  const order = useLiveQuery(() => db.order.toArray(), [], [])
  const allNFts = useLiveQuery(() => db.nfts.toArray(), [], [])

  const rarity = useLiveQuery(
    () =>
      db.rarity
        // .where("nftMint")
        // .anyOf(nfts.map((n) => n.nftMint))
        .filter((r) => Boolean(r.howRare || r.moonRank))
        .toArray(),
    [],
    []
  )

  const allNfts = useLiveQuery(() => db.nfts.toArray(), [], [])

  const nftsFromDb = useLiveQuery(
    () => {
      const query = showAllWallets ? db.nfts.where("owner").anyOf(publicKeys) : db.nfts.where({ owner: publicKey })
      if (router.query.filter === "loans") {
        if (loanType === "borrowed") {
          return query
            .filter((item) => Boolean(item.loan && item.loan.status === "active" && item.status === "loan-taken"))
            .toArray()
        } else {
          const pks = showAllWallets ? publicKeys : [publicKey]
          return db.nfts.filter((item) => pks.includes(item.loan?.lender!)).toArray()
        }
      }
      if (router.query.filter === "cnfts") {
        return query.filter((item) => item.metadata.tokenStandard === 0 && !!item.compression?.compressed).toArray()
      }
      if (router.query.filter === "sfts") {
        return query.filter((item) => item.metadata.tokenStandard === 1).toArray()
      }
      if (router.query.filter === "starred") {
        return query.filter((item) => starredNfts.map((n) => n.nftId).includes(item.nftMint)).toArray()
      }
      if (router.query.filter === "spl") {
        return query.filter((item) => item.metadata.tokenStandard === 2).toArray()
      }
      if (router.query.filter === "editions") {
        return query.filter((item) => item.metadata.tokenStandard === 3).toArray()
      }
      if (router.query.filter === "nfts") {
        return query
          .filter((item) => [0, null, 4].includes(item.metadata.tokenStandard) && !item.compression?.compressed)
          .toArray()
      }
      if (router.query.filter === "vault") {
        return query.filter((item) => item.status === "inVault").toArray()
      }
      if (router.query.filter === "listings") {
        return query.filter((item) => item.status === "listed").toArray()
      }
      if (!router.query.filter && !router.query.collectionId && !router.query.tag) {
        return query.filter((item) => [0, 4, 5].includes(item.metadata.tokenStandard!)).toArray()
      }
      if (router.query.filter === "junk") {
        return query
          .filter((item) =>
            Boolean(
              // things on HR or MR probably aren't junk
              !rarity.find((r) => r.nftMint === item.nftMint) &&
                // things categorised by HM prob aren't junk
                !item.helloMoonCollectionId &&
                // frozen things are probably cool
                !item.status &&
                // things that have a value aren't junk
                !item.price &&
                // NFT editions probably aren't junk
                item.metadata.tokenStandard !== 3 &&
                // website in description is probably junk
                ((item.content?.metadata.description || "").match(
                  /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
                ) ||
                  // includes junk words - probably junk
                  [
                    "whitelist",
                    "invited",
                    "upgrade",
                    "reward",
                    "free",
                    "reveal here",
                    "upgrade here",
                    "mystery box",
                    "claim",
                    "exchange here",
                    "airdrop",
                    "mystery",
                  ].some((trigger) => (item?.content?.metadata?.description || "").toLowerCase().includes(trigger)))
            )
          )
          .toArray()
      }
      if (router.query.tag) {
        if (router.query.tag === "untagged") {
          return query.filter((item) => !allTaggedNfts.map((t) => t.nftId).includes(item.nftMint)).toArray()
        }
        return query.filter((item) => taggedNfts.map((t) => t.nftId).includes(item.nftMint)).toArray()
      }
      if (router.query.collectionId) {
        if (router.query.collectionId === "uncategorized") {
          return query
            .filter(
              (item) =>
                [0, 4, 5].includes(item.metadata.tokenStandard!) &&
                !item.collectionId &&
                !item.helloMoonCollectionId &&
                allNFts.filter((n) => n.firstVerifiedCreator === item.firstVerifiedCreator).length === 1
            )
            .toArray()
        }
        return query.filter((item) => item.collectionIdentifier === router.query.collectionId).toArray()
      }
      return []
    },
    [publicKey, showStarred, sort, router.query, taggedNfts, allNFts, publicKeys, showAllWallets, loanType],
    []
  )

  useEffect(() => {
    setNfts(nftsFromDb)
  }, [nftsFromDb])

  useEffect(() => {
    setNfts([])
  }, [router.query, publicKey])

  // if (collections.length && nfts.find((n) => !n.helloMoonCollectionId)) {
  //   collections.push({
  //     id: 'unknown',
  //     name: 'Unknown collection',
  //     nfts: nfts.filter((n) => !n.helloMoonCollectionId),
  //     value: 0,
  //   });
  // }

  // const nfts = (
  //   useLiveQuery(
  //     () =>
  //       db &&
  //       db.nfts
  //         .where('nftMint')
  //         .anyOf(loans.map((l) => l.nftMint))
  //         .sortBy(sort),
  //     [db, wallet.publicKey, loans, sort],
  //     []
  //   ) || []
  // ).map((nft) => {
  //   const loan = loans.find((l) => l.nftMint === nft.nftMint);
  //   if (!loan) {
  //     return nft;
  //   }
  //   return {
  //     ...nft,
  //     amount: loan.amountToRepay,
  //     duration: loan.duration,
  //   };
  // });

  let filtered: Nft[] = (nfts || [])
    .filter((nft) => !showStarred || starredNfts.map((n) => n.nftId).includes(nft.nftMint))
    .filter((nft) => !showUntagged || !allTaggedNfts.map((t) => t.nftId).includes(nft.nftMint))
    .filter((nft) => !showLoans || nft.loan)
    .filter((nft) => {
      if (!selectedTags.length) {
        return true
      }
      return taggedNfts
        .filter((t) => selectedTags.includes(t.tagId))
        .map((t) => t.nftId)
        .includes(nft.nftMint)
    })
    .filter((nft) => {
      if (!search) {
        return true
      }

      const s = search.toLowerCase()
      let name = nft.content?.metadata?.name || nft.metadata.name || ""
      if (typeof name !== "string") {
        name = `${name}`
      }
      const symbol = nft.content?.metadata?.symbol || nft.metadata.symbol || ""
      const description = nft.content?.metadata?.description || ""

      if (s.includes("traits:")) {
        const num = parseInt(s.split(":")[1])
        if (num) {
          return (
            nft.content?.metadata.attributes?.filter(
              (att) => att && att.value !== "none" && att.value !== "None" && att.value !== "NONE"
            ).length === num
          )
        }
      }

      if (s.includes(":")) {
        const [trait_type, value] = s.split(":").map((item) => item.trim().toLocaleLowerCase())
        if (trait_type && value) {
          return (
            nft.content?.metadata?.attributes
              ?.find((att) => att?.trait_type?.toLowerCase() === trait_type)
              ?.value?.toLowerCase() === value
          )
        }
      }

      const values = (nft.content?.metadata?.attributes || []).map((att: any) => `${att?.value || ""}`.toLowerCase())
      return (
        nft.nftMint === search ||
        nft.status === s ||
        name.toLowerCase().includes(s) ||
        description.toLowerCase().includes(s) ||
        symbol.toLowerCase().includes(s) ||
        values.some((val: any) => val.includes(s))
      )
    })

  if (sort === "name") {
    filtered = sortBy(filtered, (item) => item.content?.metadata.name)
  }

  if (sort === "howRare") {
    filtered = sortBy(filtered, (item) => rarity.find((r) => r.nftMint === item.nftMint)?.howRare)
  }

  if (sort === "moonRank") {
    filtered = sortBy(filtered, (item) => rarity.find((r) => r.nftMint === item.nftMint)?.moonRank)
  }

  if (sort === "howRareDesc") {
    filtered = sortBy(filtered, (item) => rarity.find((r) => r.nftMint === item.nftMint)?.howRare).reverse()
  }

  if (sort === "moonRankDesc") {
    filtered = sortBy(filtered, (item) => rarity.find((r) => r.nftMint === item.nftMint)?.moonRank).reverse()
  }

  if (sort === "background") {
    filtered = sortBy(filtered, (item) => {
      const bg = item.content?.metadata?.attributes?.find(
        (att) => att.trait_type?.toLowerCase() === "background"
      )?.value
      return bg
    })
  }

  if (sort === "outstanding") {
    filtered = orderBy(filtered, (item) => item.loan?.amountToRepay || 0, "desc")
  }

  if (sort === "value") {
    filtered = orderBy(
      filtered,
      (item) => {
        const balance =
          (showAllWallets
            ? publicKeys.reduce((sum, pk) => sum + (item.balance?.[pk as keyof object] || 0), 0)
            : item.balance?.[publicKey as keyof object]) || 0

        const price = item.price || 0
        const value = price * balance
        return value || 0
      },
      "desc"
    )
  }

  if (sort === "expiring") {
    filtered = sortBy(filtered, (item) => item.loan?.defaults || 0)
  }

  if (sort === "balance") {
    filtered = sortBy(filtered, (item) => {
      const balance =
        (showAllWallets
          ? publicKeys.reduce((sum, pk) => sum + (item.balance?.[pk as keyof object] || 0), 0)
          : item.balance?.[publicKey as keyof object]) || 0
      return balance
    }).reverse()
  }

  if (sort === "creator") {
    filtered = sortBy(filtered, [
      (item) => {
        const creator = item.metadata.creators?.find((c: any) => c.verified)?.address
        return creator ? base58PublicKey(creator) : null
      },
      "name",
    ])
  }

  if (sort === "custom") {
    let key: string
    if (router.query.filter) {
      key = router.query.filter as string
    } else if (router.query.collectionId) {
      key = router.query.collectionId as string
    } else if (router.query.tag) {
      key = router.query.tag as string
    }
    filtered = sortBy(filtered, (item) => order.find((i) => i.nftMint === item.nftMint)?.[key as keyof object])
  }

  if (sort.includes("attribute")) {
    const attribute = sort.replace("attribute.", "").toLowerCase()
    filtered = sortBy(filtered, (item) => {
      const bg = item.content?.metadata?.attributes?.find((att) => att?.trait_type?.toLowerCase() === attribute)?.value
      return bg
    })
  }

  return (
    <NftsContext.Provider
      value={{
        nfts: nfts || [],
        tags,
        taggedNfts,
        filtered,
        loading: !nfts,
        rarity,
        allNfts,
      }}
    >
      {children}
    </NftsContext.Provider>
  )
}

export const useNfts = () => {
  return useContext(NftsContext)
}
