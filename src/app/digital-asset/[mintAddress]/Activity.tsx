import { ActivityLog } from "@/components/ActivityLog"
import { NftSale } from "@/components/NftSale"
import axios from "axios"
import { Client } from "./Client"

export async function Activity({ mintAddress }: { mintAddress: string }) {
  const { data } = await axios.post(
    "https://rest-api.hellomoon.io/v0/nft/sales/secondary/latest/mint",
    {
      mint: mintAddress,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
      },
    }
  )
  const activity = data.data.sort((a, b) => b.blocktime - a.blocktime)
  return <Client activity={activity} />
}
