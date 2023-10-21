import { TreeConfig } from "@metaplex-foundation/mpl-bubblegum"
import { AccountInfo } from "./AccountInfo"
import { CheckCross } from "@/components/CheckCross"
import { CopyAddress } from "@/components/CopyAddress"
import { Typography } from "@mui/material"

export function TreeConfig({ data }: { data: TreeConfig }) {
  return (
    <AccountInfo
      rows={{
        Discriminator: <Typography>{JSON.stringify(data.discriminator, null, 1)}</Typography>,
        "Tree creator": <CopyAddress>{data.treeCreator}</CopyAddress>,
        "Tree delegate": <CopyAddress>{data.treeDelegate}</CopyAddress>,
        "Total mint capacity": <Typography>{Number(data.totalMintCapacity).toLocaleString()}</Typography>,
        "Number minted": <Typography>{Number(data.numMinted).toLocaleString()}</Typography>,
        Public: <CheckCross value={data.isPublic} />,
        Decompressible: <CheckCross value={data.isDecompressable === 1} />,
      }}
    />
  )
}
