import { Connection } from "@solana/web3.js";
import { Loan } from "../src/db";
import { PublicKey } from "@solana/web3.js";
import { LeaderboardStatsRequest, NftMintsByOwner, NftMintsByOwnerRequest, RestClient } from "@hellomoon/api";
import { partition, uniqBy, groupBy, findKey, size, uniq } from "lodash";
import axios from "axios";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { DigitalAsset, JsonMetadata, TokenStandard, fetchAllDigitalAssetByOwner, fetchDigitalAsset, fetchMasterEdition } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58PublicKey, isSome, publicKey, some, Option, unwrapSome } from "@metaplex-foundation/umi";

const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!)

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, {
  commitment: "confirmed"
})
const client = new RestClient(process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY as string);

async function getLoanSummaryForUser(publicKey: string, paginationToken?: string): Promise<any> {
  const { data } = await axios.post(`https://rest-api.hellomoon.io/v0/nft/loans`, {
    borrower: publicKey,
    status: ["open", "active"],
    limit: 10,
    paginationToken
  }, {
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`
    }
  })

  if (data.paginationToken) {
    return [
      ...data.data,
      ...await getLoanSummaryForUser(publicKey, data.paginationToken)
    ]
  }
  
  return data.data
}

async function getFrozenStatus(publicKey: string) {
  const accounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(publicKey), {
    programId: TOKEN_PROGRAM_ID,
  });
  const items = accounts.value.filter(
    (account) => account.account.data.parsed.info.state === 'frozen' && account.account.data.parsed.info.delegate
  );
  const [inVault, locked] = partition(
    items,
    (item: any) => item.account.data.parsed.info.delegate === publicKey
  );
  const [staked, frozen] = partition(locked, (item: any) =>
    [process.env.NEXT_PUBLIC_XLABS_LOCKING_WALLET, process.env.NEXT_PUBLIC_BIBLIO_LOCKING_WALLET].includes(
      item.account.data.parsed.info.delegate
    )
  );
  return {
    staked: staked.map((item: any) => item.account.data.parsed.info.mint),
    frozen: frozen.map((item: any) => item.account.data.parsed.info.mint),
    inVault: inVault.map((item: any) => item.account.data.parsed.info.mint)
  }
}

async function getOwnedHelloMoonNfts(ownerAccount: string, paginationToken?: string): Promise<NftMintsByOwner[]> {
  const result = await client.send(new NftMintsByOwnerRequest({
    ownerAccount,
    limit: 1000,
    paginationToken
  }))

  if (result.paginationToken) {
    
    return [
      ...result.data,
      ...(await getOwnedHelloMoonNfts(ownerAccount, result.paginationToken))
    ]
  }

  return result.data
}

async function getCollections(collectionIds: string[]) {
  const collections = await client.send(new LeaderboardStatsRequest({
    limit: 1000,
    helloMoonCollectionId: collectionIds,
    granularity: "ONE_DAY"
  }))
  return uniqBy(collections.data, item => item.helloMoonCollectionId)
}

self.addEventListener("message", async event => {
  try {
    let { publicKey: owner, force } = event.data;

    const [umiTokens, helloMoonNfts, loanStats, frozenStatus] = await Promise.all([
      fetchAllDigitalAssetByOwner(umi, publicKey(owner), { tokenStrategy: "getProgramAccounts"}),
      getOwnedHelloMoonNfts(owner),
      getLoanSummaryForUser(owner),
      getFrozenStatus(owner)
    ])

    type ExtendedTokenStandard = TokenStandard & {
      OCP?: 5
    }

    const ExtendedTokenStandard = {
      ...TokenStandard,
      OCP: 5
    }

    const types = groupBy(umiTokens.map(item => {
      let tokenStandard: Option<ExtendedTokenStandard> = item.metadata.tokenStandard;
      if (isSome(item.metadata.tokenStandard)) {
        if (item.metadata.tokenStandard.value === ExtendedTokenStandard.FungibleAsset && item.mint.supply === BigInt(1) && item.mint.decimals === 0) {
          tokenStandard = some(ExtendedTokenStandard.OCP)
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
        nftMint: base58PublicKey(item.mint.publicKey),
        owner,
        metadata: {
          ...item.metadata,
          tokenStandard
        }
      }
    }), token => unwrapSome(token.metadata.tokenStandard))

    const nonFungibles = [
      ...(types[ExtendedTokenStandard.NonFungible] || []),
      ...(types[ExtendedTokenStandard.ProgrammableNonFungible] || []),
      ...(types[ExtendedTokenStandard.OCP] || [])
    ]

    const nfts = nonFungibles
      .map(item => {
        const loan = loanStats.find((l: Loan) => l.collateralMint === item.nftMint);
        const status = findKey(frozenStatus, mints => mints.includes(item.nftMint));
        if (loan) {
          loan.defaults = loan.acceptBlocktime + loan.loanDurationSeconds;
        }
        const helloMoonNft = helloMoonNfts.find(hm => hm.nftMint === item.nftMint);
        const collection = unwrapSome(item.metadata.collection);
        const creators = unwrapSome(item.metadata.creators);
        const firstVerifiedCreator = creators && creators.find(c => c.verified)

        const linkedCollection = helloMoonNfts.find(hm => hm.helloMoonCollectionId && hm.helloMoonCollectionId === helloMoonNft?.helloMoonCollectionId && hm.nftCollectionMint)?.nftCollectionMint

        return {
          ...item,
          ...helloMoonNft,
          collectionId: (collection && collection.verified && base58PublicKey(collection.key)) || linkedCollection || null,
          firstVerifiedCreator: firstVerifiedCreator ? base58PublicKey(firstVerifiedCreator.address) : null,
          loan,
          status
        }
      })
      .map(item => {
        return {
          ...item,
          collectionIdentifier: item.collectionId || item.helloMoonCollectionId || item.firstVerifiedCreator
        }
      })

    self.postMessage({ type: "get-rarity", nfts, force })

    const helloMoonCollections = await getCollections(uniq(nfts.map(n => n.helloMoonCollectionId).filter(Boolean)) as string[])

    const nftPerCollection = uniqBy(
      nfts.filter(item => item.collectionId || item.helloMoonCollectionId || item.firstVerifiedCreator),
      item => item.collectionId || item.helloMoonCollectionId || item.firstVerifiedCreator
    )

    function getCollectionName(nft: DigitalAsset, meta: JsonMetadata) {
      try {
        return (meta?.collection?.name
          || meta?.collection?.family
          || meta?.name?.split('#')[0]
          || nft.metadata.name.split('#')[0]
          || nft.metadata.name).trim()
      } catch (err) {
        console.log(err)
        return (nft.metadata.name.split('#')[0] || nft.metadata.name).trim();
      }
    }

    const collections = (await Promise.all(nftPerCollection.map(async nft => {
      const helloMoonCollectionId = nfts.find(n => n.collectionIdentifier === nft.collectionIdentifier && n.helloMoonCollectionId)?.helloMoonCollectionId;
      const helloMoonCollection = helloMoonCollections.find(h => h.helloMoonCollectionId === helloMoonCollectionId) || {} as any;
      if (nft.collectionId) {
        try {
          const collection = await fetchDigitalAsset(umi, publicKey(nft.collectionId));
          const { data: json } = await axios.get(collection.metadata.uri);

          const name = collection && (collection.metadata.name || json.name) !== 'Collection NFT'
            ? json.name || collection.metadata.name
            : helloMoonCollection?.collectionName || getCollectionName(nft, json)

          return {
            ...helloMoonCollection,
            collectionName: name,
            image: json.image,
            collectionId: nft.collectionId
          }
        } catch (err) {
          try {
            const { data: json } = await axios.get(nft.metadata.uri!);
            return {
              collectionId: nft.collectionId,
              image: json.image,
              collectionName: getCollectionName(nft, json),
              ...helloMoonCollection,
            }
          } catch {
            return size(helloMoonCollection) ? { ...helloMoonCollection, collectionId: "unknown" } : null
          }
        }
      } else if (nft.firstVerifiedCreator) {
        try {
          const { data: json } = await axios.get(nft.metadata.uri!);
          return {
            firstVerifiedCreator: nft.firstVerifiedCreator,
            image: json.image,
            collectionName: getCollectionName(nft, json),
            ...helloMoonCollection,
          }
        } catch {
          return size(helloMoonCollection) ? { ...helloMoonCollection, collectionId: "unknown" } : null
        }
      } else {
        return size(helloMoonCollection) ? { ...helloMoonCollection, collectionId: "unknown" } : null
      }
    }))).filter(Boolean)

    const fungibles = [
      ...(types[ExtendedTokenStandard.Fungible] || []),
      ...(types[ExtendedTokenStandard.FungibleAsset] || [])
    ]

    const fungiblesWithBalances = await Promise.all(fungibles.map(async item => {
      const ata = await getAssociatedTokenAddress(new PublicKey(item.nftMint), new PublicKey(owner));
      const balance = await connection.getTokenAccountBalance(ata)
      return {
        ...item,
        supply: Number(item.mint.supply.toString()),
        balance: balance.value.uiAmount
      }
    }))

    const editionsWithNumbers = await Promise.all((types[ExtendedTokenStandard.NonFungibleEdition] || []).map(async item => {
      if (item.edition?.isOriginal) {
        return item;
      }

      const masterEdition = await fetchMasterEdition(umi, item.edition?.parent!)
      if (!masterEdition) {
        return {
          ...item,
          editionDetails: {
            edition: item.edition?.edition || "unknown",
            supply: 'unknown'
          }
        }
      }

      return {
        ...item,
        editionDetails: {
          edition: item.edition?.edition || "unknown",
          supply: unwrapSome(masterEdition.maxSupply) || "unknown"
        }
      }
    }))

    const collectionsToAdd = uniqBy(collections.map(item => {
      return {
        ...item,
        id: item.collectionId || item.helloMoonCollectionId || item.firstVerifiedCreator
      }
    }), collection => collection.id)
    .filter(item => Boolean(item.id))

    const nftsToAdd = [...fungiblesWithBalances, ...nfts, ...editionsWithNumbers];
    console.log('data ended')
    self.postMessage({ type: "done", collectionsToAdd, nftsToAdd })

  } catch (err) {
    console.log(err);
    self.postMessage({ type: "error" })
  }
});