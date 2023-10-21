import { getAccount } from "../helpers/get-account"
import { Typography } from "@mui/material"
import { DefaultComponent } from "../components/DefaultComponent"
import { umi } from "@/app/helpers/umi"
import { publicKey } from "@metaplex-foundation/umi"

export default async function Info({ params }: { params: Record<string, string> }) {
  const acc = await umi.rpc.getAccount(publicKey(params.address))
  const accountDetails = await getAccount(params.address)
  if (!accountDetails) {
    return <Typography>Account not found</Typography>
  }
  return accountDetails.Component ? (
    <accountDetails.Component data={accountDetails.data} />
  ) : (
    <DefaultComponent data={accountDetails.data} />
  )
}
