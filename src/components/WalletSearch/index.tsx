import { Stack, SvgIcon, Typography } from "@mui/material"
import { Connection, PublicKey } from "@solana/web3.js"
import { useRouter } from "next/router"
import { FC, useEffect, useState } from "react"
import BinocularsIcon from "./binoculars.svg"
import { getDomainKeySync, NameRegistryState } from "@bonfida/spl-name-service"
import { useEnsAddress } from "wagmi"
import { isAddress } from "viem"
import { AddressSelector } from "../AddressSelector"
import { useAlchemy } from "../../context/alchemy"
import { isValidPublicKey } from "../../helpers/utils"
import { toast } from "react-hot-toast"
import { useWallets } from "../../context/wallets"
import { Wallet } from "../../db"
import { MainDomain, TldParser, findMainDomain } from "@onsol/tldparser"

const ENS_CONTRACT_ADDRESS = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85"

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })

const fetchMainDomain = async (connection: Connection, pubkey: string | PublicKey): Promise<MainDomain | undefined> => {
  if (typeof pubkey === "string") {
    pubkey = new PublicKey(pubkey)
  }
  const [mainDomainPubkey] = findMainDomain(pubkey)
  let mainDomain = undefined
  try {
    mainDomain = await MainDomain.fromAccountAddress(connection, mainDomainPubkey)
    return mainDomain
  } catch (e) {
    console.log("No main domain found")
  }
  return mainDomain
}

async function resolveDomain(domain: string) {
  // initialize a Tld Parser
  const parser = new TldParser(connection)

  return await parser.getOwnerFromDomainTld(domain)
}

export async function getPublicKeyFromSolDomain(domain: string): Promise<string | null> {
  try {
    const { pubkey } = getDomainKeySync(domain)
    const owner = (await NameRegistryState.retrieve(connection, pubkey)).registry.owner.toBase58()
    return owner
  } catch (err: any) {
    return null
  }
}

type WalletSearchProps = {
  large?: boolean
}

const EthWallet: FC<{ name: string }> = ({ name }) => {
  const { data: address } = useEnsAddress({ name })
  const router = useRouter()

  if (address) {
    router.push(`/wallet/${address}`)
  }

  return null
}

const SolWallet: FC<{ name: string }> = ({ name }) => {
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const address = await getPublicKeyFromSolDomain(name)
      if (address) {
        router.push(`/wallet/${address}`)
      }
    })()
  })

  return null
}

export const WalletSearch: FC<WalletSearchProps> = ({ large }) => {
  const alchemy = useAlchemy()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const { wallets, addWallet } = useWallets()
  const router = useRouter()

  useEffect(() => {
    if (wallet) {
      router.push(`/wallet/${wallet.publicKey}`)
    }
  }, [wallet])

  async function addAndSelectWallet(publicKey: string, chain: string, nickname?: string) {
    const wallet = await addWallet(publicKey, nickname, false, true, chain)
    setWallet(wallet)
  }

  async function checkWallet(item: string) {
    if (item.includes(".eth")) {
      const address = await alchemy.core.resolveName(item)
      if (address) {
        addAndSelectWallet(address, "eth", item)
      } else {
        toast.error("ENS address not found")
      }
    } else if (isAddress(item)) {
      const ens = await alchemy.core.lookupAddress(item)
      addAndSelectWallet(item, "eth")
    } else if (item.includes(".sol")) {
      const address = await getPublicKeyFromSolDomain(item)
      if (address) {
        addAndSelectWallet(address, "solana", item)
      }
    } else if (item.includes(".")) {
      const address = await resolveDomain(item)
      if (address) {
        addAndSelectWallet(address.toBase58(), "solana", item)
      }
    } else if (isValidPublicKey(item)) {
      addAndSelectWallet(item, "solana")
    } else {
      toast.error("Invalid address")
    }
  }

  return (
    <AddressSelector
      wallet={wallet}
      setWallet={setWallet}
      sx={{ minWidth: "300px" }}
      label={
        <Stack direction="row" spacing={1}>
          <SvgIcon>
            <BinocularsIcon />
          </SvgIcon>
          <Typography>Wallet Peek</Typography>
        </Stack>
      }
      size="small"
      showChain
      addDialog={false}
      onNotFound={checkWallet}
      deletable={true}
    />
  )
}
