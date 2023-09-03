import { Helius } from "helius-sdk"

export const HELIUS_RPC = `https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`

export const helius = new Helius(process.env.NEXT_PUBLIC_HELIUS_API_KEY!)
