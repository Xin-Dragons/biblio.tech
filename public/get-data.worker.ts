import { uniqBy, groupBy, size, uniq, chunk, flatten, omit } from "lodash"
import axios from "axios"
import { JsonMetadata, fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { publicKey, some, Option, unwrapOption, PublicKey } from "@metaplex-foundation/umi"
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox"
import { getAllByOwner, getAllFungiblesByOwner, getDigitalAssets, getNfts } from "../src/helpers/helius"
import {
  DelegateRole,
  ExtensionType,
  State,
  fetchAllAsset,
  getAssetGpaBuilder,
  getExtension,
  niftyAsset,
} from "@nifty-oss/asset"
import { Key, fetchAllCollectionV1, getAssetV1GpaBuilder, mplCore } from "@metaplex-foundation/mpl-core"
import { DAS } from "helius-sdk"

const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })
  .use(mplToolbox())
  .use(mplCore())
  .use(niftyAsset())
  .use(mplTokenMetadata())

// async function getListings(owner: string) {
//   const result = await client.send(
//     new NftListingStatusRequest({
//       seller: owner,
//       isListed: true,
//     })
//   )

//   return result.data
// }

// async function getTokenPrices(mints: string[]) {
//   const batches = chunk(mints, 100)

//   const headers = {
//     Authorization: "Bearer 678c78ac-efa1-42d5-bfea-cc860c73ed3d",
//   }

//   const results = flatten(
//     await Promise.all(
//       batches.map(async (batch) => {
//         try {
//           const params = {
//             mints: batch,
//           }

//           const { data } = await axios.post("https://rest-api.hellomoon.io/v0/token/price/batched", params, { headers })
//           return data.data
//         } catch (err) {
//           console.log(err)
//         }
//       })
//     )
//   )

//   return flatten(results).filter(Boolean)
// }

// async function getOutstandingLoans(publicKey: string, paginationToken?: string): Promise<any> {
//   const { data } = await axios.post(
//     `https://rest-api.hellomoon.io/v0/nft/loans`,
//     {
//       borrower: publicKey,
//       status: ["open", "active"],
//       limit: 1000,
//       paginationToken,
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
//       },
//     }
//   )

//   if (data.paginationToken) {
//     return [...data.data, ...(await getOutstandingLoans(publicKey, data.paginationToken))]
//   }

//   return data.data
// }

// async function getIncomingLoans(publicKey: string, paginationToken?: string): Promise<any> {
//   const { data } = await axios.post(
//     `https://rest-api.hellomoon.io/v0/nft/loans`,
//     {
//       lender: publicKey,
//       status: ["open", "active"],
//       limit: 1000,
//       paginationToken,
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
//       },
//     }
//   )

//   if (data.paginationToken) {
//     return [...data.data, ...(await getIncomingLoans(publicKey, data.paginationToken))]
//   }

//   return data.data
// }

function getStatus(items: DAS.GetAssetResponse[], publicKeys: string[]) {
  return items.map((item) => {
    if (
      !["NonFungible", "ProgrammableNonFungible", "NonFungibleEdition", undefined].includes(
        (item.content?.metadata as any).token_standard
      ) &&
      item.interface !== ("MplCoreAsset" as any)
    ) {
      return item
    }

    const { delegate, delegated, frozen } = item.ownership

    if (frozen && delegated && delegate) {
      if (publicKeys.includes(delegate)) {
        return {
          ...item,
          status: "inVault",
        }
      }

      if (delegate === process.env.NEXT_PUBLIC_XLABS_LOCKING_WALLET) {
        return {
          ...item,
          status: "staked",
        }
      }

      return {
        ...item,
        status: "frozen",
      }
    }

    return item
  })
}

// async function getOwnedHelloMoonNfts(ownerAccount: string, paginationToken?: string): Promise<NftMintsByOwner[]> {
//   const result = await client.send(
//     new NftMintsByOwnerRequest({
//       ownerAccount,
//       limit: 1000,
//       paginationToken,
//     })
//   )

//   if (result.paginationToken) {
//     return [...result.data, ...(await getOwnedHelloMoonNfts(ownerAccount, result.paginationToken))]
//   }

//   return result.data
// }

// async function getCollections(collectionIds: string[]) {
//   const collections = await client.send(
//     new LeaderboardStatsRequest({
//       limit: 1000,
//       helloMoonCollectionId: collectionIds,
//       granularity: "ONE_DAY",
//     })
//   )
//   return uniqBy(collections.data, (item) => item.helloMoonCollectionId)
// }

interface DigitalAssetWithStatus extends DAS.GetAssetResponse {
  status?: string
}

interface DigitalAssetWithStatusAndOwner extends DigitalAssetWithStatus {
  owner?: string
}

async function getNifty(owner: PublicKey) {
  return await getAssetGpaBuilder(umi).whereField("owner", owner).getDeserialized()
}

async function getCore(owner: PublicKey) {
  return await getAssetV1GpaBuilder(umi).whereField("owner", owner).whereField("key", Key.AssetV1).getDeserialized()
}

async function getTensorInventory(owner: string) {
  const res = await fetch("/api/get-tensor-inventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publicKey: owner,
    }),
  })

  if (!res.ok) {
    throw new Error("Error getting inventory")
  }

  const resJson = await res.json()

  return resJson.tensorInventory
}

const tokenStandard = [
  "NonFungible",
  "FungibleAsset",
  "Fungible",
  "NonFungibleEdition",
  "ProgrammableNonFungible",
  "ProgrammableNonFungibleEdition",
  "Nifty",
  "Core",
]

self.addEventListener("message", async (event) => {
  try {
    const { publicKey: owner, force, mints, publicKeys } = event.data

    let [tensorInventory, digitalAssets, nifty, fungibles] = await Promise.all([
      getTensorInventory(owner),
      getAllByOwner(owner),
      getNifty(owner),
      getAllFungiblesByOwner(owner),
    ])

    digitalAssets = getStatus(digitalAssets, publicKeys)

    digitalAssets = [...digitalAssets, ...fungibles]

    const assets = flatten(tensorInventory.inventoryBySlug.map((collection) => collection.mints))
    const collections = tensorInventory.inventoryBySlug.map((coll) => {
      return {
        id: coll.id,
        collectionName: coll.name,
        chain: "solana",
        image: coll.imageUri,
        floorPrice: coll.statsV2?.buyNowPrice,
        numMints: coll.statsV2?.numMints,
      }
    })
    console.log(collections)

    const listedAssets = assets.filter((a) => a.activeListings.length)
    const listedDigitalAssets = (await getDigitalAssets(listedAssets.map((a) => a.onchainId))).map((item) => {
      const tensorAsset = listedAssets.find((l) => l.onchainId === item.id) as any
      return {
        ...item,
        listing: {
          price: tensorAsset.activeListings[0].tx.grossAmount,
        },
      }
    })

    console.log({ listedAssets })

    const types = groupBy(
      [...digitalAssets, ...listedDigitalAssets].map((item: DigitalAssetWithStatus) => {
        const tensorAsset = assets.find((a: any) => a.onchainId === item.id) as any

        let ts = item.interface === ("MplCoreAsset" as any) ? "Core" : (item.content?.metadata as any).token_standard

        return {
          ...item,
          nftMint: item.id,
          owner: (item as any).ownership.owner,
          metadata: {
            ...item.content?.metadata,
            tokenStandard: ts ? tokenStandard.indexOf(ts) : 0,
          },
          listing: tensorAsset?.activeListings[0]?.tx,
          collection: tensorAsset?.collection.id,
        }
      }),
      (token) => token.metadata.tokenStandard
    )

    const nonFungibles = [...(types[0] || []), ...(types[4] || [])]

    const nfts = nonFungibles
      .map((item) => {
        const creators = item.creators
        const firstVerifiedCreator = creators && creators.find((c) => c.verified)

        const delegate = item.ownership.delegate

        return {
          ...item,
          firstVerifiedCreator: firstVerifiedCreator ? firstVerifiedCreator.address : null,
          status: item.listing ? "listed" : item.status,
          delegate,
        }
      })
      .map((item) => {
        return {
          ...item,
          collectionIdentifier: item.collection,
        }
      })

    const fungiblesTokens = [...(types[1] || []), ...(types[2] || [])]
    const editionsWithNumbers = types[3] || []

    const mappedNifty = nifty.map((n) => {
      const metadata = getExtension(n, ExtensionType.Metadata)
      const attributes = getExtension(n, ExtensionType.Attributes)
      const royalties = getExtension(n, ExtensionType.Royalties)
      const creators = getExtension(n, ExtensionType.Creators)

      let status
      if (n.state === State.Locked) {
        if (!n.delegate || (n.delegate?.address && publicKeys.includes(n.delegate.address))) {
          status = "inVault"
        } else if (n.delegate?.roles.includes(DelegateRole.Transfer)) {
          status = "listed"
        } else {
          status = "frozen"
        }
      }

      return {
        id: n.publicKey,
        nftMint: n.publicKey,
        burnt: false,
        chain: "solana",
        status,
        owner: n.owner,
        collectionId: n.group,
        collectionIdentifier: n.group,
        metadata: {
          tokenStandard: 6,
          sellerFeeBasisPoints: royalties?.basisPoints,
          symbol: metadata?.symbol,
        },
        content: {
          json_uri: metadata?.uri,
          metadata: {
            attributes: attributes
              ? attributes.values.map((a) => {
                  return {
                    trait_type: a.name,
                    value: a.value,
                  }
                })
              : null,
            token_standard: 6,
            name: n.name,
            symbol: metadata?.symbol,
            description: metadata?.description,
            sellerFeeBasisPoints: royalties?.basisPoints,
          },
        },
        ownership: {
          frozen: n.state === State.Locked,
          delegated: !!n.delegate,
          delegate: n.delegate?.address,
          owner: n.owner,
        },
        royalty: {
          basis_points: royalties?.basisPoints,
        },
        creators: creators ? creators.values : [],
        authorities: [
          {
            address: n.authority,
            scopes: ["full"],
          },
        ],
      }
    })

    const niftyCollectionPks = uniq(nifty.map((c) => c.group).filter(Boolean)) as PublicKey[]

    const niftyCollections = await fetchAllAsset(umi, niftyCollectionPks)

    const mappedNiftyCollections = niftyCollections.map((c) => {
      const metadata = getExtension(c, ExtensionType.Metadata)
      return {
        id: c.publicKey,
        collectionId: c.publicKey,
        chain: "solana",
        collectionName: c.name,
        uri: metadata?.uri,
        assetType: "Nifty",
      }
    })

    const nftsToAdd = [...fungiblesTokens, ...nfts, ...editionsWithNumbers].map((n) => {
      return {
        ...omit(n, "edition", "mint", "publicKey"),
        metadata: {
          tokenStandard: n?.metadata?.tokenStandard,
          sellerFeeBasisPoints: n.royalty?.basis_points,
          symbol: n?.metadata?.symbol,
        },
        chain: "solana",
      }
    })

    self.postMessage({
      type: "done",
      nftsToAdd: [...nftsToAdd, ...mappedNifty],
      collectionsToAdd: [...collections, ...mappedNiftyCollections],
    })
  } catch (err) {
    console.log(err)
  }
})

// self.addEventListener("message", async (event) => {
//   try {
//     let { publicKey: owner, force, mints, publicKeys } = event.data

//     const ownerPk = publicKey(owner)

//     let [digitalAssets, nifty, core, fungibles, tensorInventory] = await Promise.all([
//       getAllByOwner(owner),
//       getNifty(ownerPk),
//       getCore(ownerPk),
//       getAllFungiblesByOwner(owner),
//       getTensorInventory(owner),
//       // getOwnedHelloMoonNfts(owner),
//       // getOutstandingLoans(owner),
//       // getIncomingLoans(owner),
//       // getListings(owner),
//     ])

//     console.log({ tensorInventory })

//     digitalAssets = getStatus(digitalAssets, publicKeys)

//     digitalAssets = [...digitalAssets, ...fungibles]

//     // const mintsInWallet = umiTokens.map((token) => token.mint.publicKey)

//     // const loanedOut = loanStats
//     //   .map((l: Loan) => l.collateralMint as string)
//     //   .filter((mint: string) => !mintsInWallet.includes(publicKey(mint)))
//     //   .map(publicKey)

//     // if (loanedOut.length) {
//     //   const loanedNfts = (await fetchAllDigitalAsset(umi, loanedOut)).map((item) => {
//     //     return {
//     //       ...item,
//     //       status: "loan-taken",
//     //     } as DigitalAssetWithStatus
//     //   })
//     //   umiTokens = uniqBy([...umiTokens, ...loanedNfts], (item) => item.mint.publicKey)
//     // }

//     // const lentOn = incomingLoans
//     //   .map((l: Loan) => l.collateralMint as string)
//     //   .filter(Boolean)
//     //   .filter((mint: string) => !mintsInWallet.includes(publicKey(mint)))

//     // if (lentOn.length) {
//     //   const lentOnDigitalAssets = await fetchAllDigitalAsset(
//     //     umi,
//     //     lentOn.map((l: string) => publicKey(l))
//     //   )
//     //   const lentOnNfts = lentOnDigitalAssets.map((item) => {
//     //     return {
//     //       ...item,
//     //       status: "loan-given",
//     //       owner: incomingLoans.find((i: Loan) => i.collateralMint === item.publicKey).borrower,
//     //     } as DigitalAssetWithStatusAndOwner
//     //   })
//     //   umiTokens = uniqBy([...umiTokens, ...lentOnNfts], (item) => item.mint.publicKey)
//     // }

//     // if (listings.length) {
//     //   const listedNfts = (await getDigitalAssets(listings.map((l) => publicKey(l.nftMint)))).map((item) => {
//     //     return {
//     //       ...item,
//     //       status: "listed",
//     //       ownership: {
//     //         ...item.ownership,
//     //         owner,
//     //       },
//     //     }
//     //   })

//     //   digitalAssets = uniqBy([...digitalAssets, ...listedNfts], (item) => item.id)
//     // }

//     const tokenStandard = [
//       "NonFungible",
//       "FungibleAsset",
//       "Fungible",
//       "NonFungibleEdition",
//       "ProgrammableNonFungible",
//       "ProgrammableNonFungibleEdition",
//       "Nifty",
//       "Core",
//     ]

//     const types = groupBy(
//       digitalAssets.map((item: DigitalAssetWithStatus) => {
//         let ts = item.interface === ("MplCoreAsset" as any) ? "Core" : (item.content?.metadata as any).token_standard

//         return {
//           ...item,
//           nftMint: item.id,
//           owner: (item as any).ownership.owner,
//           metadata: {
//             ...item.content?.metadata,
//             tokenStandard: ts ? tokenStandard.indexOf(ts) : 0,
//           },
//         }
//       }),
//       (token) => token.metadata.tokenStandard
//     )

//     const nonFungibles = [...(types[0] || []), ...(types[4] || [])]

//     const nfts = nonFungibles
//       .map((item) => {
//         // const loanTaken = loanStats.find((l: Loan) => l.collateralMint === item.nftMint)
//         // const loanGiven = incomingLoans.find((l: Loan) => l.collateralMint === item.nftMint)
//         // const listing = listings.find((l: any) => l.nftMint === item.nftMint)
//         // if (loanTaken) {
//         //   loanTaken.defaults = loanTaken.acceptBlocktime + loanTaken.loanDurationSeconds
//         // }
//         // if (loanGiven) {
//         //   loanGiven.defaults = loanGiven.acceptBlocktime + loanGiven.loanDurationSeconds
//         // }
//         // const helloMoonNft = helloMoonNfts.find((hm) => hm.nftMint === item.nftMint)
//         const collection = item.grouping?.find((g) => g.group_key === "collection")?.group_value
//         const creators = item.creators
//         const firstVerifiedCreator = creators && creators.find((c) => c.verified)
//         // const linkedCollection = helloMoonNfts.find(
//         //   (hm) =>
//         //     hm.helloMoonCollectionId &&
//         //     hm.helloMoonCollectionId === helloMoonNft?.helloMoonCollectionId &&
//         //     hm.nftCollectionMint
//         // )?.nftCollectionMint

//         const delegate = item.ownership.delegate

//         return {
//           ...item,
//           // ...helloMoonNft,
//           collectionId: collection || null,
//           firstVerifiedCreator: firstVerifiedCreator ? firstVerifiedCreator.address : null,
//           // loan: loanTaken || loanGiven,
//           // status: (loanTaken ? "loan-taken" : loanGiven ? "loan-given" : listing ? "listed" : null) || item.status,
//           // status: listing ? "listed" : item.status,
//           delegate,
//           // listing,
//         }
//       })
//       // .map((item, index, all) => {
//       //   // clean missing hello moon collection data if partial collection
//       //   if (!item.helloMoonCollectionId) {
//       //     const helloMoonCollectionId = (
//       //       all
//       //         .filter((nft) => nft.firstVerifiedCreator === item.firstVerifiedCreator)
//       //         .find((nft) => nft.helloMoonCollectionId) || {}
//       //     ).helloMoonCollectionId
//       //     return {
//       //       ...item,
//       //       helloMoonCollectionId,
//       //     }
//       //   }
//       //   return item
//       // })
//       .map((item) => {
//         return {
//           ...item,
//           collectionIdentifier: item.collectionId || item.firstVerifiedCreator,
//         }
//       })

//     self.postMessage({
//       type: "get-rarity",
//       nfts: nfts.map((n) => omit(n, "edition", "mint", "publicKey")),
//       force,
//     })

//     // const helloMoonCollections = await getCollections(
//     // uniq(nfts.map((n) => n.helloMoonCollectionId).filter(Boolean)) as string[]
//     // )

//     const nftPerCollection = uniqBy(
//       nfts.filter((item) => item.collectionId || item.firstVerifiedCreator),
//       (item) => item.collectionId || item.firstVerifiedCreator
//     )

//     function getCollectionName(nft: any, meta: JsonMetadata) {
//       try {
//         return (
//           meta?.collection?.name ||
//           meta?.collection?.family ||
//           meta?.name?.split("#")[0] ||
//           nft.metadata.name.split("#")[0] ||
//           nft.metadata.name
//         ).trim()
//       } catch (err) {
//         console.log(err)
//         return (nft.metadata.name.split("#")[0] || nft.metadata.name).trim()
//       }
//     }

//     const collections = (
//       await Promise.all(
//         nftPerCollection.map(async (nft) => {
//           if (nft.collectionId) {
//             try {
//               const collection = await fetchDigitalAsset(umi, publicKey(nft.collectionId))
//               const { data: json } = await axios.get(collection.metadata.uri, {
//                 signal: (AbortSignal as any).timeout(1000),
//               })

//               const name =
//                 collection && (collection.metadata.name || json.name) !== "Collection NFT"
//                   ? json.name || collection.metadata.name
//                   : getCollectionName(nft, json)

//               return {
//                 collectionName: name,
//                 image: json.image,
//                 collectionId: nft.collectionId,
//               }
//             } catch (err) {
//               try {
//                 const { data: json } = await axios.get(nft.content?.json_uri!, {
//                   signal: (AbortSignal as any).timeout(1000),
//                 })
//                 return {
//                   collectionId: nft.collectionId,
//                   image: json.image,
//                   collectionName: getCollectionName(nft, json),
//                 }
//               } catch (err) {
//                 return null
//               }
//             }
//           } else if (nft.firstVerifiedCreator) {
//             try {
//               const { data: json } = await axios.get(nft.content?.json_uri!, {
//                 signal: (AbortSignal as any).timeout(1000),
//               })
//               return {
//                 firstVerifiedCreator: nft.firstVerifiedCreator,
//                 image: json.image,
//                 collectionName: getCollectionName(nft, json),
//               }
//             } catch (err) {
//               console.log(err)
//               return null
//             }
//           } else {
//             return null
//           }
//         })
//       )
//     ).filter(Boolean)

//     const fungiblesTokens = [...(types[1] || []), ...(types[2] || [])]

//     // const fungiblesWithBalances = await Promise.all(
//     //   fungibles.map(async (item) => {
//     //     console.log({ fungible: item })
//     //     return {
//     //       ...item,
//     //       balance: {
//     //         [owner]: Number(item.token.amount / BigInt(Math.pow(10, item.mint.decimals))),
//     //       },
//     //       price: prices.find((p) => p.mints === item.nftMint),
//     //     }
//     //   })
//     // )

//     const editionsWithNumbers = types[3] || []

//     const mappedNifty = nifty.map((n) => {
//       const metadata = getExtension(n, ExtensionType.Metadata)
//       const attributes = getExtension(n, ExtensionType.Attributes)
//       const royalties = getExtension(n, ExtensionType.Royalties)
//       const creators = getExtension(n, ExtensionType.Creators)

//       let status
//       if (n.state === State.Locked) {
//         if (!n.delegate || (n.delegate?.address && publicKeys.includes(n.delegate.address))) {
//           status = "inVault"
//         } else if (n.delegate?.roles.includes(DelegateRole.Transfer)) {
//           status = "listed"
//         } else {
//           status = "frozen"
//         }
//       }

//       return {
//         id: n.publicKey,
//         nftMint: n.publicKey,
//         burnt: false,
//         chain: "solana",
//         status,
//         owner: n.owner,
//         collectionId: n.group,
//         collectionIdentifier: n.group,
//         metadata: {
//           tokenStandard: 6,
//           sellerFeeBasisPoints: royalties?.basisPoints,
//           symbol: metadata?.symbol,
//         },
//         content: {
//           json_uri: metadata?.uri,
//           metadata: {
//             attributes: attributes
//               ? attributes.values.map((a) => {
//                   return {
//                     trait_type: a.name,
//                     value: a.value,
//                   }
//                 })
//               : null,
//             token_standard: 6,
//             name: n.name,
//             symbol: metadata?.symbol,
//             description: metadata?.description,
//             sellerFeeBasisPoints: royalties?.basisPoints,
//           },
//         },
//         ownership: {
//           frozen: n.state === State.Locked,
//           delegated: !!n.delegate,
//           delegate: n.delegate?.address,
//           owner: n.owner,
//         },
//         royalty: {
//           basis_points: royalties?.basisPoints,
//         },
//         creators: creators ? creators.values : [],
//         authorities: [
//           {
//             address: n.authority,
//             scopes: ["full"],
//           },
//         ],
//       }
//     })

//     const coreCollectionPks = uniq(
//       core
//         .map((c) => {
//           return c.updateAuthority.type === "Collection" && c.updateAuthority.address
//         })
//         .filter(Boolean)
//     ) as PublicKey[]

//     const niftyCollectionPks = uniq(nifty.map((c) => c.group).filter(Boolean)) as PublicKey[]

//     const [niftyCollections, coreCollections] = await Promise.all([
//       fetchAllAsset(umi, niftyCollectionPks),
//       fetchAllCollectionV1(umi, coreCollectionPks),
//     ])

//     const mappedCore = (types[7] || [])
//       .map((da) => {
//         const n = core.find((c) => c.publicKey === da.id)
//         if (!n) {
//           return null
//         }
//         let status
//         if (n.permanentFreezeDelegate?.frozen) {
//           status = "frozen"
//         } else if (n.freezeDelegate?.frozen) {
//           if (n.freezeDelegate.frozen && n.transferDelegate) {
//             status = "listed"
//           } else if (publicKeys.includes(n.freezeDelegate.authority.address)) {
//             status = "inVault"
//           } else {
//             status = "frozen"
//           }
//         }

//         const collectionId = n.updateAuthority.type === "Collection" && n.updateAuthority.address

//         let delegate

//         if (n.permanentFreezeDelegate) {
//           const authority = n.permanentFreezeDelegate.authority
//           if (authority.type === "Owner") {
//             delegate = n.owner
//           } else if (authority.type === "Address") {
//             delegate = authority.address
//           } else if (authority.type === "UpdateAuthority") {
//             delegate = n.updateAuthority.address
//           } else if (authority.type === "None") {
//             delegate = null
//           }
//         } else if (n.freezeDelegate) {
//           const authority = n.freezeDelegate.authority
//           if (authority.type === "Owner") {
//             delegate = n.owner
//           } else if (authority.type === "Address") {
//             delegate = authority.address
//           } else if (authority.type === "UpdateAuthority") {
//             delegate = n.updateAuthority.address
//           } else if (authority.type === "None") {
//             delegate = null
//           }
//         }

//         let updateAuthority
//         if (n.updateAuthority.type === "Address") {
//           updateAuthority = n.updateAuthority.address
//         } else if (n.updateAuthority.type === "Collection") {
//           const collection = coreCollections.find((c) => c.publicKey === collectionId)
//           updateAuthority = collection?.updateAuthority
//         }

//         return {
//           ...da,
//           nftMint: n.publicKey,
//           burnt: false,
//           chain: "solana",
//           owner: n.owner,
//           status,
//           collectionId,
//           collectionIdentifier: collectionId,
//           metadata: {
//             tokenStandard: 7,
//             sellerFeeBasisPoints: n.royalties?.basisPoints,
//           },
//           content: {
//             ...da.content,
//             json_uri: n.uri,
//             metadata: {
//               attributes: n.attributes
//                 ? n.attributes.attributeList.map((a) => {
//                     return {
//                       trait_type: a.key,
//                       value: a.value,
//                     }
//                   })
//                 : null,
//               token_standard: 7,
//               name: n.name,
//             },
//           },
//           ownership: {
//             frozen: n.permanentFreezeDelegate?.frozen || n.freezeDelegate?.frozen,
//             delegated: !!n.permanentFreezeDelegate || n.freezeDelegate,
//             delegate,
//             owner: n.owner,
//           },
//           royalty: {
//             basis_points: n.royalties?.basisPoints,
//           },
//           creators: n.royalties?.creators.map((c) => {
//             return {
//               address: c.address,
//               share: c.percentage,
//             }
//           }),
//           authorities: [
//             {
//               address: updateAuthority,
//               scopes: ["full"],
//             },
//           ],
//         }
//       })
//       .filter(Boolean)

//     const coreCollectionDas = await getDigitalAssets(coreCollections.map((c) => c.publicKey))
//     console.log(coreCollectionDas)

//     const mappedCoreCollections = coreCollections.map((c) => {
//       const da = coreCollectionDas.find((d) => d.id === c.publicKey)
//       return {
//         id: c.publicKey,
//         collectionId: c.publicKey,
//         chain: "solana",
//         collectionName: c.name,
//         uri: c.uri,
//         image: da?.content?.links?.image,
//         assetType: "Core",
//       }
//     })
//     const mappedNiftyCollections = niftyCollections.map((c) => {
//       const metadata = getExtension(c, ExtensionType.Metadata)
//       return {
//         id: c.publicKey,
//         collectionId: c.publicKey,
//         chain: "solana",
//         collectionName: c.name,
//         uri: metadata?.uri,
//         assetType: "Nifty",
//       }
//     })

//     const nftsToAdd = [...fungiblesTokens, ...nfts, ...editionsWithNumbers].map((n) => {
//       return {
//         ...omit(n, "edition", "mint", "publicKey"),
//         metadata: {
//           tokenStandard: n.metadata.tokenStandard,
//           sellerFeeBasisPoints: n.royalty?.basis_points,
//           symbol: n.metadata.symbol,
//         },
//         chain: "solana",
//       }
//     })

//     const collectionsToAdd = uniqBy(
//       [...collections, ...mappedCoreCollections, ...mappedNiftyCollections].map((item) => {
//         return {
//           ...item,
//           id: item?.collectionId || item?.firstVerifiedCreator,
//         }
//       }),
//       (collection) => collection.id
//     )
//       .filter((item) => Boolean(item.id))
//       .map((c) => {
//         return {
//           ...c,
//           chain: "solana",
//         }
//       })

//     self.postMessage({
//       type: "done",
//       nftsToAdd: [...nftsToAdd, ...mappedNifty, ...mappedCore],
//       collectionsToAdd,
//     })
//   } catch (err) {
//     console.log(err)
//     self.postMessage({ type: "error" })
//   }
// })
