import { DigitalAsset } from "@metaplex-foundation/mpl-token-metadata"
import { DigitalAssetWithJson } from "./context/nft"

export function NftImage({ nft }: { nft: DigitalAssetWithJson }) {
  return (
    <img
      width="100%"
      src={
        nft?.json?.image
          ? `https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${nft.json.image}`
          : "/blank-light.png"
      }
    />
  )
}
