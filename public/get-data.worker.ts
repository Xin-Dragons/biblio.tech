import { Loan } from "../src/db"
import {
  LeaderboardStatsRequest,
  NftMintsByOwner,
  NftMintsByOwnerRequest,
  RestClient,
  NftListingStatusRequest,
} from "@hellomoon/api"
import { uniqBy, groupBy, size, uniq, chunk, flatten, omit } from "lodash"
import axios from "axios"
import {
  DigitalAssetWithToken,
  JsonMetadata,
  TokenStandard,
  TokenState,
  fetchAllDigitalAsset,
  fetchAllDigitalAssetWithTokenByOwner,
  fetchDigitalAsset,
  fetchMasterEdition,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata"
import { TokenState as NftTokenState } from "@metaplex-foundation/mpl-toolbox"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { isSome, publicKey, some, Option, unwrapOption } from "@metaplex-foundation/umi"
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox"
import { getAllByOwner, getAllFungiblesByOwner, getDigitalAssets, getNfts } from "../src/helpers/helius"
import { DAS } from "helius-sdk"

const MOB_TRAITS = publicKey("5j3KnVdZPgPRFcMgAn9cL68xNXtXSHFUbvSjcn9JUPQy")

const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })
  .use(mplToolbox())
  .use(mplTokenMetadata())

const client = new RestClient(process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY as string)

async function getListings(owner: string) {
  const result = await client.send(
    new NftListingStatusRequest({
      seller: owner,
      isListed: true,
    })
  )

  return result.data
}

async function getTokenPrices(mints: string[]) {
  const batches = chunk(mints, 100)

  const headers = {
    Authorization: "Bearer 678c78ac-efa1-42d5-bfea-cc860c73ed3d",
  }

  const results = flatten(
    await Promise.all(
      batches.map(async (batch) => {
        try {
          const params = {
            mints: batch,
          }

          const { data } = await axios.post("https://rest-api.hellomoon.io/v0/token/price/batched", params, { headers })
          return data.data
        } catch (err) {
          console.log(err)
        }
      })
    )
  )

  return flatten(results).filter(Boolean)
}

async function getOutstandingLoans(publicKey: string, paginationToken?: string): Promise<any> {
  const { data } = await axios.post(
    `https://rest-api.hellomoon.io/v0/nft/loans`,
    {
      borrower: publicKey,
      status: ["open", "active"],
      limit: 1000,
      paginationToken,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
      },
    }
  )

  if (data.paginationToken) {
    return [...data.data, ...(await getOutstandingLoans(publicKey, data.paginationToken))]
  }

  return data.data
}

async function getIncomingLoans(publicKey: string, paginationToken?: string): Promise<any> {
  const { data } = await axios.post(
    `https://rest-api.hellomoon.io/v0/nft/loans`,
    {
      lender: publicKey,
      status: ["open", "active"],
      limit: 1000,
      paginationToken,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
      },
    }
  )

  if (data.paginationToken) {
    return [...data.data, ...(await getIncomingLoans(publicKey, data.paginationToken))]
  }

  return data.data
}

function getStatus(items: DAS.GetAssetResponse[], publicKeys: string[]) {
  return items.map((item) => {
    if (
      !["NonFungible", "ProgrammableNonFungible", undefined].includes((item.content?.metadata as any).token_standard)
    ) {
      return item
    }

    const { delegate, delegated, frozen } = item.ownership

    if (delegated && frozen) {
      console.log("eee", item.id)
    }

    if (frozen && delegated && delegate) {
      console.log(publicKeys, delegate, publicKeys.includes(delegate))
      if (publicKeys.includes(delegate)) {
        console.log("IN VAULT")
        return {
          ...item,
          status: "inVault",
        }
      }

      if (delegate === process.env.NEXT_PUBLIC_BIBLIO_LOCKING_WALLET) {
        return {
          ...item,
          status: "linked",
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

async function getOwnedHelloMoonNfts(ownerAccount: string, paginationToken?: string): Promise<NftMintsByOwner[]> {
  const result = await client.send(
    new NftMintsByOwnerRequest({
      ownerAccount,
      limit: 1000,
      paginationToken,
    })
  )

  if (result.paginationToken) {
    return [...result.data, ...(await getOwnedHelloMoonNfts(ownerAccount, result.paginationToken))]
  }

  return result.data
}

async function getCollections(collectionIds: string[]) {
  const collections = await client.send(
    new LeaderboardStatsRequest({
      limit: 1000,
      helloMoonCollectionId: collectionIds,
      granularity: "ONE_DAY",
    })
  )
  return uniqBy(collections.data, (item) => item.helloMoonCollectionId)
}

self.addEventListener("message", async (event) => {
  try {
    let { publicKey: owner, force, mints, publicKeys } = event.data

    let [digitalAssets, fungibles, helloMoonNfts, listings] = await Promise.all([
      getAllByOwner(owner),
      getAllFungiblesByOwner(owner),
      getOwnedHelloMoonNfts(owner),
      // getOutstandingLoans(owner),
      // getIncomingLoans(owner),
      getListings(owner),
    ])

    digitalAssets = getStatus(digitalAssets, publicKeys)

    digitalAssets = [...digitalAssets, ...fungibles]

    // const mintsInWallet = umiTokens.map((token) => token.mint.publicKey)

    // const loanedOut = loanStats
    //   .map((l: Loan) => l.collateralMint as string)
    //   .filter((mint: string) => !mintsInWallet.includes(publicKey(mint)))
    //   .map(publicKey)

    // if (loanedOut.length) {
    //   const loanedNfts = (await fetchAllDigitalAsset(umi, loanedOut)).map((item) => {
    //     return {
    //       ...item,
    //       status: "loan-taken",
    //     } as DigitalAssetWithStatus
    //   })
    //   umiTokens = uniqBy([...umiTokens, ...loanedNfts], (item) => item.mint.publicKey)
    // }

    // const lentOn = incomingLoans
    //   .map((l: Loan) => l.collateralMint as string)
    //   .filter(Boolean)
    //   .filter((mint: string) => !mintsInWallet.includes(publicKey(mint)))

    // if (lentOn.length) {
    //   const lentOnDigitalAssets = await fetchAllDigitalAsset(
    //     umi,
    //     lentOn.map((l: string) => publicKey(l))
    //   )
    //   const lentOnNfts = lentOnDigitalAssets.map((item) => {
    //     return {
    //       ...item,
    //       status: "loan-given",
    //       owner: incomingLoans.find((i: Loan) => i.collateralMint === item.publicKey).borrower,
    //     } as DigitalAssetWithStatusAndOwner
    //   })
    //   umiTokens = uniqBy([...umiTokens, ...lentOnNfts], (item) => item.mint.publicKey)
    // }

    if (listings.length) {
      const listedNfts = (await getDigitalAssets(listings.map((l) => publicKey(l.nftMint)))).map((item) => {
        return {
          ...item,
          status: "listed",
          ownership: {
            ...item.ownership,
            owner,
          },
        }
      })

      digitalAssets = uniqBy([...digitalAssets, ...listedNfts], (item) => item.id)
    }

    const tokenStandard = [
      "NonFungible",
      "FungibleAsset",
      "Fungible",
      "NonFungibleEdition",
      "ProgrammableNonFungible",
      "ProgrammableNonFungibleEdition",
    ]

    interface DigitalAssetWithStatus extends DAS.GetAssetResponse {
      status?: string
    }

    interface DigitalAssetWithStatusAndOwner extends DigitalAssetWithStatus {
      owner?: string
    }

    const types = groupBy(
      digitalAssets.map((item: DigitalAssetWithStatus) => {
        let ts = (item.content?.metadata as any).token_standard

        return {
          ...item,
          nftMint: item.id,
          owner: (item as any).ownership.owner,
          metadata: {
            ...item.content?.metadata,
            tokenStandard: ts ? tokenStandard.indexOf(ts) : 0,
          },
        }
      }),
      (token) => token.metadata.tokenStandard
    )

    const nonFungibles = [...(types[0] || []), ...(types[4] || [])]

    const nfts = nonFungibles
      .map((item) => {
        // const loanTaken = loanStats.find((l: Loan) => l.collateralMint === item.nftMint)
        // const loanGiven = incomingLoans.find((l: Loan) => l.collateralMint === item.nftMint)
        const listing = listings.find((l: any) => l.nftMint === item.nftMint)
        // if (loanTaken) {
        //   loanTaken.defaults = loanTaken.acceptBlocktime + loanTaken.loanDurationSeconds
        // }
        // if (loanGiven) {
        //   loanGiven.defaults = loanGiven.acceptBlocktime + loanGiven.loanDurationSeconds
        // }
        const helloMoonNft = helloMoonNfts.find((hm) => hm.nftMint === item.nftMint)
        const collection = item.grouping?.find((g) => g.group_key === "collection")?.group_value
        const creators = item.creators
        const firstVerifiedCreator = creators && creators.find((c) => c.verified)
        const linkedCollection = helloMoonNfts.find(
          (hm) =>
            hm.helloMoonCollectionId &&
            hm.helloMoonCollectionId === helloMoonNft?.helloMoonCollectionId &&
            hm.nftCollectionMint
        )?.nftCollectionMint

        const delegate = item.ownership.delegate

        return {
          ...item,
          ...helloMoonNft,
          collectionId: collection || linkedCollection || null,
          firstVerifiedCreator: firstVerifiedCreator ? firstVerifiedCreator.address : null,
          // loan: loanTaken || loanGiven,
          // status: (loanTaken ? "loan-taken" : loanGiven ? "loan-given" : listing ? "listed" : null) || item.status,
          status: listing ? "listed" : item.status,
          delegate,
          listing,
        }
      })
      .map((item, index, all) => {
        // clean missing hello moon collection data if partial collection
        if (!item.helloMoonCollectionId) {
          const helloMoonCollectionId = (
            all
              .filter((nft) => nft.firstVerifiedCreator === item.firstVerifiedCreator)
              .find((nft) => nft.helloMoonCollectionId) || {}
          ).helloMoonCollectionId
          return {
            ...item,
            helloMoonCollectionId,
          }
        }
        return item
      })
      .map((item) => {
        return {
          ...item,
          collectionIdentifier: item.collectionId || item.helloMoonCollectionId || item.firstVerifiedCreator,
        }
      })

    self.postMessage({
      type: "get-rarity",
      nfts: nfts.map((n) => omit(n, "edition", "mint", "publicKey")),
      force,
    })

    const helloMoonCollections = await getCollections(
      uniq(nfts.map((n) => n.helloMoonCollectionId).filter(Boolean)) as string[]
    )

    const nftPerCollection = uniqBy(
      nfts.filter((item) => item.collectionId || item.helloMoonCollectionId || item.firstVerifiedCreator),
      (item) => item.collectionId || item.helloMoonCollectionId || item.firstVerifiedCreator
    )

    function getCollectionName(nft: any, meta: JsonMetadata) {
      try {
        return (
          meta?.collection?.name ||
          meta?.collection?.family ||
          meta?.name?.split("#")[0] ||
          nft.metadata.name.split("#")[0] ||
          nft.metadata.name
        ).trim()
      } catch (err) {
        console.log(err)
        return (nft.metadata.name.split("#")[0] || nft.metadata.name).trim()
      }
    }

    const collections = (
      await Promise.all(
        nftPerCollection.map(async (nft) => {
          const helloMoonCollectionId = nfts.find(
            (n) => n.collectionIdentifier === nft.collectionIdentifier && n.helloMoonCollectionId
          )?.helloMoonCollectionId
          const helloMoonCollection =
            helloMoonCollections.find((h) => h.helloMoonCollectionId === helloMoonCollectionId) || ({} as any)
          if (nft.collectionId) {
            try {
              const collection = await fetchDigitalAsset(umi, publicKey(nft.collectionId))
              const { data: json } = await axios.get(collection.metadata.uri, {
                signal: (AbortSignal as any).timeout(1000),
              })

              const name =
                collection && (collection.metadata.name || json.name) !== "Collection NFT"
                  ? json.name || collection.metadata.name
                  : helloMoonCollection?.collectionName || getCollectionName(nft, json)

              return {
                ...helloMoonCollection,
                collectionName: name,
                image: json.image,
                collectionId: nft.collectionId,
              }
            } catch (err) {
              try {
                const { data: json } = await axios.get(nft.content?.json_uri!, {
                  signal: (AbortSignal as any).timeout(1000),
                })
                return {
                  collectionId: nft.collectionId,
                  image: json.image,
                  collectionName: getCollectionName(nft, json),
                  ...helloMoonCollection,
                }
              } catch (err) {
                return size(helloMoonCollection) ? { ...helloMoonCollection, collectionId: "unknown" } : null
              }
            }
          } else if (nft.firstVerifiedCreator) {
            try {
              const { data: json } = await axios.get(nft.content?.json_uri!, {
                signal: (AbortSignal as any).timeout(1000),
              })
              return {
                firstVerifiedCreator: nft.firstVerifiedCreator,
                image: json.image,
                collectionName: getCollectionName(nft, json),
                ...helloMoonCollection,
              }
            } catch (err) {
              console.log(err)
              return size(helloMoonCollection) ? { ...helloMoonCollection, collectionId: "unknown" } : null
            }
          } else {
            return size(helloMoonCollection) ? { ...helloMoonCollection, collectionId: "unknown" } : null
          }
        })
      )
    ).filter(Boolean)

    const fungiblesTokens = [...(types[1] || []), ...(types[2] || [])]

    // const fungiblesWithBalances = await Promise.all(
    //   fungibles.map(async (item) => {
    //     console.log({ fungible: item })
    //     return {
    //       ...item,
    //       balance: {
    //         [owner]: Number(item.token.amount / BigInt(Math.pow(10, item.mint.decimals))),
    //       },
    //       price: prices.find((p) => p.mints === item.nftMint),
    //     }
    //   })
    // )

    const editionsWithNumbers = types[3] || []

    const collectionsToAdd = uniqBy(
      collections.map((item) => {
        return {
          ...item,
          id: item.collectionId || item.helloMoonCollectionId || item.firstVerifiedCreator,
        }
      }),
      (collection) => collection.id
    )
      .filter((item) => Boolean(item.id))
      .map((c) => {
        return {
          ...c,
          chain: "solana",
        }
      })

    const nftsToAdd = [...fungiblesTokens, ...nfts, ...editionsWithNumbers].map((n) => {
      return {
        ...omit(n, "edition", "mint", "publicKey"),
        metadata: {
          tokenStandard: n.metadata.tokenStandard,
          sellerFeeBasisPoints: n.royalty?.basis_points,
          symbol: n.metadata.symbol,
        },
        chain: "solana",
      }
    })

    self.postMessage({ type: "done", nftsToAdd, collectionsToAdd })
  } catch (err) {
    console.log(err)
    self.postMessage({ type: "error" })
  }
})
