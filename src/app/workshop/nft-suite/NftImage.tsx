import { DigitalAsset, JsonMetadata } from "@metaplex-foundation/mpl-token-metadata"

export function NftImage({ nft }: { nft: DigitalAsset & { json: JsonMetadata } }) {
  return (
    <img
      width="100%"
      src={
        nft?.json?.image ? `https://cdn.magiceden.io/rs:fill:400:400:0:0/plain/${nft.json.image}` : "/blank-light.png"
      }
    />
  )
}
