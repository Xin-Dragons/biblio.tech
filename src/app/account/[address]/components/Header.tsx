import { AccountHeader } from "@metaplex-foundation/umi"
import { Card, CardContent, Typography } from "@mui/material"
import { AccountInfo } from "./AccountInfo"
import { CheckCross } from "@/components/CheckCross"
import { CopyAddress } from "@/components/CopyAddress"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

export function Header({ header }: { header: AccountHeader }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h4">Header</Typography>
        <AccountInfo
          dense
          rows={{
            Executable: <CheckCross value={header.executable} />,
            Owner: <CopyAddress linkPath="account">{header.owner}</CopyAddress>,
            SOL: <Typography>{Number(header.lamports.basisPoints) / LAMPORTS_PER_SOL}</Typography>,
            "Rent epoch": <Typography>{header.rentEpoch}</Typography>,
          }}
        />
      </CardContent>
    </Card>
  )
}
