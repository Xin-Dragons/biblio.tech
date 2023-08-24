import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"

export const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" }).use(mplTokenMetadata())
