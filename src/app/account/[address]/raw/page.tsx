import { umi } from "@/app/helpers/umi"
import { publicKey } from "@metaplex-foundation/umi"
import { getAccount } from "../helpers/get-account"
import { Typography } from "@mui/material"
import { Client } from "./Client"

export default async function Raw({ params }: { params: Record<string, string> }) {
  const account = await umi.rpc.getAccount(publicKey(params.address))
  if (!account.exists) {
    return <Typography>Account not found</Typography>
  }
  const accountData = await getAccount(params.address)
  return <Client account={account} parsedAccount={accountData?.data} />
}
