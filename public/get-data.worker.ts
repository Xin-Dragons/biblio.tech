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

function getStatus(items: DigitalAssetWithToken[], publicKeys: string[]) {
  return items.map((item) => {
    if (
      ![TokenStandard.NonFungible, TokenStandard.ProgrammableNonFungible, null].includes(
        unwrapOption(item.metadata.tokenStandard)!
      )
    ) {
      return item
    }

    if (item.tokenRecord) {
      if (TokenState.Unlocked === item.tokenRecord.state) {
        return item
      }

      if (TokenState.Locked === item.tokenRecord.state) {
        const delegate = unwrapOption(item.tokenRecord.delegate) || ""
        if (publicKeys.includes(delegate)) {
          return {
            ...item,
            status: "inVault",
          }
        } else if (delegate === process.env.NEXT_PUBLIC_BIBLIO_LOCKING_WALLET) {
          return {
            ...item,
            status: "linked",
          }
        } else if (delegate === process.env.NEXT_PUBLIC_XLABS_LOCKING_WALLET) {
          return {
            ...item,
            status: "staked",
          }
        } else {
          return {
            ...item,
            status: "frozen",
          }
        }
      }

      if (TokenState.Listed === item.tokenRecord.state) {
        return {
          ...item,
          status: "staked",
        }
      }
    } else if (item.token && item.token.state === NftTokenState.Frozen) {
      const delegate = unwrapOption(item.token.delegate) || ""
      if (publicKeys.includes(delegate)) {
        return {
          ...item,
          status: "inVault",
        }
      } else if (delegate === process.env.NEXT_PUBLIC_BIBLIO_LOCKING_WALLET) {
        return {
          ...item,
          status: "linked",
        }
      } else if (delegate === process.env.NEXT_PUBLIC_XLABS_LOCKING_WALLET) {
        return {
          ...item,
          status: "staked",
        }
      } else {
        return {
          ...item,
          status: "frozen",
        }
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

    let [umiTokens, helloMoonNfts, loanStats, incomingLoans, listings] = await Promise.all([
      fetchAllDigitalAssetWithTokenByOwner(umi, owner, { tokenStrategy: "getProgramAccounts" }),
      getOwnedHelloMoonNfts(owner),
      getOutstandingLoans(owner),
      getIncomingLoans(owner),
      getListings(owner),
    ])

    umiTokens = getStatus(umiTokens as DigitalAssetWithToken[], publicKeys)

    const mintsInWallet = umiTokens.map((token) => token.mint.publicKey)

    const loanedOut = loanStats
      .map((l: Loan) => l.collateralMint as string)
      .filter((mint: string) => !mintsInWallet.includes(publicKey(mint)))
      .map(publicKey)

    if (loanedOut.length) {
      const loanedNfts = (await fetchAllDigitalAsset(umi, loanedOut)).map((item) => {
        return {
          ...item,
          status: "loan-taken",
        } as DigitalAssetWithStatus
      })
      umiTokens = uniqBy([...umiTokens, ...loanedNfts], (item) => item.mint.publicKey)
    }

    const lentOn = incomingLoans
      .map((l: Loan) => l.collateralMint as string)
      .filter(Boolean)
      .filter((mint: string) => !mintsInWallet.includes(publicKey(mint)))

    if (lentOn.length) {
      const lentOnDigitalAssets = await fetchAllDigitalAsset(
        umi,
        lentOn.map((l: string) => publicKey(l))
      )
      const lentOnNfts = lentOnDigitalAssets.map((item) => {
        return {
          ...item,
          status: "loan-given",
          owner: incomingLoans.find((i: Loan) => i.collateralMint === item.publicKey).borrower,
        } as DigitalAssetWithStatusAndOwner
      })
      umiTokens = uniqBy([...umiTokens, ...lentOnNfts], (item) => item.mint.publicKey)
    }

    if (listings.length) {
      const listedNfts = (
        await fetchAllDigitalAsset(
          umi,
          listings.map((l) => publicKey(l.nftMint))
        )
      ).map((item) => {
        return {
          ...item,
          status: "listed",
        } as DigitalAssetWithStatus
      })

      umiTokens = uniqBy([...umiTokens, ...listedNfts], (item) => item.mint.publicKey)
    }

    type ExtendedTokenStandard = TokenStandard & {
      OCP?: 5
    }

    const ExtendedTokenStandard = {
      ...TokenStandard,
      OCP: 5,
    }

    interface DigitalAssetWithStatus extends DigitalAssetWithToken {
      status?: string
    }

    interface DigitalAssetWithStatusAndOwner extends DigitalAssetWithStatus {
      owner?: string
    }

    const types = groupBy(
      umiTokens.map((item: DigitalAssetWithStatus) => {
        let tokenStandard: Option<ExtendedTokenStandard> = item.metadata.tokenStandard
        const collection = unwrapOption(item.metadata.collection)
        if (isSome(item.metadata.tokenStandard)) {
          if (
            item.metadata.tokenStandard.value === ExtendedTokenStandard.FungibleAsset &&
            item.mint.supply === BigInt(1) &&
            item.mint.decimals === 0
          ) {
            if (collection && collection.verified && collection.key === MOB_TRAITS) {
              tokenStandard = some(ExtendedTokenStandard.FungibleAsset)
            } else {
              tokenStandard = some(ExtendedTokenStandard.OCP)
            }
          }
        } else {
          if (item.mint.supply === BigInt(1) && item.mint.decimals === 0) {
            tokenStandard = some(ExtendedTokenStandard.NonFungible)
          } else if (item.mint.supply > BigInt(1) && item.mint.decimals === 0) {
            tokenStandard = some(ExtendedTokenStandard.FungibleAsset)
          } else if (item.mint.supply > BigInt(1) && item.mint.decimals > 0) {
            tokenStandard = some(ExtendedTokenStandard.Fungible)
          }
        }

        return {
          ...item,
          status: item.status,
          nftMint: item.mint.publicKey,
          owner: (item as any).owner || owner,
          metadata: {
            ...item.metadata,
            tokenStandard: unwrapOption(tokenStandard),
          },
        }
      }),
      (token) => token.metadata.tokenStandard
    )

    const nonFungibles = [
      ...(types[ExtendedTokenStandard.NonFungible] || []),
      ...(types[ExtendedTokenStandard.ProgrammableNonFungible] || []),
      ...(types[ExtendedTokenStandard.OCP] || []),
    ]

    console.log("mapping non fungibles")

    const nfts = nonFungibles
      .map((item) => {
        const loanTaken = loanStats.find((l: Loan) => l.collateralMint === item.nftMint)
        const loanGiven = incomingLoans.find((l: Loan) => l.collateralMint === item.nftMint)
        const listing = listings.find((l: any) => l.nftMint === item.nftMint)
        if (loanTaken) {
          loanTaken.defaults = loanTaken.acceptBlocktime + loanTaken.loanDurationSeconds
        }
        if (loanGiven) {
          loanGiven.defaults = loanGiven.acceptBlocktime + loanGiven.loanDurationSeconds
        }
        const helloMoonNft = helloMoonNfts.find((hm) => hm.nftMint === item.nftMint)
        const collection = unwrapOption(item.metadata.collection)
        const creators = unwrapOption(item.metadata.creators)
        const firstVerifiedCreator = creators && creators.find((c) => c.verified)
        const linkedCollection = helloMoonNfts.find(
          (hm) =>
            hm.helloMoonCollectionId &&
            hm.helloMoonCollectionId === helloMoonNft?.helloMoonCollectionId &&
            hm.nftCollectionMint
        )?.nftCollectionMint

        let delegate

        if (item.tokenRecord) {
          delegate = unwrapOption(item.tokenRecord?.delegate!)
        } else if (item.token) {
          delegate = item.token ? unwrapOption(item.token?.delegate!) : null
        }

        return {
          ...item,
          ...helloMoonNft,
          collectionId: (collection && collection.verified && collection.key) || linkedCollection || null,
          firstVerifiedCreator: firstVerifiedCreator ? firstVerifiedCreator.address : null,
          loan: loanTaken || loanGiven,
          status: (loanTaken ? "loan-taken" : loanGiven ? "loan-given" : listing ? "listed" : null) || item.status,
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

    console.log("getting rarity")

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

    console.log("getting collections")

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
              const { data: json } = await axios.get(collection.metadata.uri)

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
              console.log(1, err)
              try {
                const { data: json } = await axios.get(nft.metadata.uri!)
                return {
                  collectionId: nft.collectionId,
                  image: json.image,
                  collectionName: getCollectionName(nft, json),
                  ...helloMoonCollection,
                }
              } catch (err) {
                console.log(2, err)
                return size(helloMoonCollection) ? { ...helloMoonCollection, collectionId: "unknown" } : null
              }
            }
          } else if (nft.firstVerifiedCreator) {
            try {
              const { data: json } = await axios.get(nft.metadata.uri!)
              return {
                firstVerifiedCreator: nft.firstVerifiedCreator,
                image: json.image,
                collectionName: getCollectionName(nft, json),
                ...helloMoonCollection,
              }
            } catch (err) {
              console.log(3, err)
              return size(helloMoonCollection) ? { ...helloMoonCollection, collectionId: "unknown" } : null
            }
          } else {
            return size(helloMoonCollection) ? { ...helloMoonCollection, collectionId: "unknown" } : null
          }
        })
      )
    ).filter(Boolean)

    const fungibles = [
      ...(types[ExtendedTokenStandard.Fungible] || []),
      ...(types[ExtendedTokenStandard.FungibleAsset] || []),
    ]

    console.log("got collections")

    const prices = await getTokenPrices(fungibles.map((n) => n.nftMint))

    const fungiblesWithBalances = await Promise.all(
      fungibles.map(async (item) => {
        return {
          ...item,
          balance: {
            [owner]: Number(item.token.amount / BigInt(Math.pow(10, item.mint.decimals))),
          },
          price: prices.find((p) => p.mints === item.nftMint),
        }
      })
    )

    const editionsWithNumbers = await Promise.all(
      (types[ExtendedTokenStandard.NonFungibleEdition] || []).map(async (item) => {
        if (item.edition?.isOriginal) {
          return item
        }

        const masterEdition = await fetchMasterEdition(umi, item.edition?.parent!)
        if (!masterEdition) {
          return {
            ...item,
            editionDetails: {
              edition: item.edition?.edition || "unknown",
              supply: "unknown",
            },
          }
        }

        return {
          ...item,
          editionDetails: {
            edition: item.edition?.edition || "unknown",
            supply: unwrapOption(masterEdition.maxSupply) || "unknown",
          },
        }
      })
    )

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

    const nftsToAdd = [...fungiblesWithBalances, ...nfts, ...editionsWithNumbers].map((n) => {
      return {
        ...omit(n, "edition", "mint", "publicKey"),
        mint: {
          freezeAuthority: isSome(n.mint.freezeAuthority) ? n.mint.freezeAuthority.value : null,
        },
        metadata: {
          tokenStandard: n.metadata.tokenStandard,
          sellerFeeBasisPoints: n.metadata.sellerFeeBasisPoints,
          symbol: n.metadata.symbol,
        },
        chain: "solana",
      }
    })

    self.postMessage({ type: "done", nftsToAdd, collectionsToAdd })
  } catch (err) {
    self.postMessage({ type: "error" })
  }
})
