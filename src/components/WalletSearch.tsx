"use client"
import { Stack, SvgIcon, Typography } from "@mui/material"
import { makeStyles } from "@mui/styles"
import { Connection } from "@solana/web3.js"
import { FC, useEffect, useState } from "react"
import BinocularsIcon from "@/../public/binoculars.svg"
import { getDomainKeySync, NameRegistryState } from "@bonfida/spl-name-service"
import { isAddress } from "viem"
import { AddressSelector } from "./AddressSelector"
import { useAlchemy } from "../context/alchemy"
import { isDigitalAsset, isValidPublicKey, isWallet } from "../helpers/utils"
import { toast } from "react-hot-toast"
import { useWallets } from "../context/wallets"
import { Wallet } from "../db"
import { useUmi } from "../context/umi"
import { useRouter } from "next/navigation"

const ENS_CONTRACT_ADDRESS = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85"

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })

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

export function WalletSearch({ large }: { large?: boolean }) {
  const alchemy = useAlchemy()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const { addWallet } = useWallets()
  const router = useRouter()
  const umi = useUmi()

  useEffect(() => {
    console.log(wallet)
    if (!wallet) {
      return
    }
    // @ts-ignore
    if (wallet.isCollection) {
      console.log("redirecting")
      router.push(`/collection/${wallet?.publicKey}`)
    } else if (wallet?.publicKey) {
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
    } else if (isValidPublicKey(item)) {
      if (await isWallet(umi, item)) {
        return addAndSelectWallet(item, "solana")
      } else if (await isDigitalAsset(umi, item)) {
        console.log("NAVIGATING")
        router.replace(`/digital-asset/${item}`)
        return
      } else {
        toast.error("Only wallets and digital assets can be looked up at present")
      }
    } else {
      toast.error("Invalid address")
    }
  }

  return (
    <AddressSelector
      wallet={wallet}
      setWallet={setWallet}
      sx={{
        minWidth: "300px",
        "& .MuiFormLabel-root": {
          display: "flex",
          alignItems: "center",
          "& .myIcon": {
            paddingRight: "4px",
            order: 0,
          },
        },
      }}
      label={
        <>
          <SvgIcon className="myIcon">
            <BinocularsIcon />
          </SvgIcon>
          Omnisearch
        </>
      }
      showChain
      lookupCollection
      addDialog={false}
      onNotFound={checkWallet}
      deletable={true}
      size="large"
    />
  )
}
