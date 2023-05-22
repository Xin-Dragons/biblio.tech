import { Close, Search } from "@mui/icons-material"
import { IconButton, InputAdornment, SvgIcon, TextField } from "@mui/material"
import { Connection, PublicKey } from "@solana/web3.js"
import { useRouter } from "next/router"
import { FC, useEffect, useState } from "react"
import BinocularsIcon from "./binoculars.svg"
import { getDomainKeySync, NameRegistryState } from "@bonfida/spl-name-service"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useAccess } from "../../context/access"

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "confirmed" })

export async function getPublicKeyFromSolDomain(domain: string): Promise<string> {
  const { pubkey } = getDomainKeySync(domain)
  const owner = (await NameRegistryState.retrieve(connection, pubkey)).registry.owner.toBase58()
  return owner
}

export const WalletSearch: FC = () => {
  const [publicKey, setPublicKey] = useState("")
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (router.query.publicKey) {
      setPublicKey(router.query.publicKey as string)
    } else {
      setPublicKey("")
    }
  }, [router.query])

  async function isValidPublicKey(pk: string) {
    try {
      new PublicKey(pk)
      return true
    } catch (err: any) {
      try {
        const valid = await getPublicKeyFromSolDomain(pk)
        if (valid) {
          return true
        }
        console.log(err)
        return false
      } catch {
        setPublicKeyError("Invalid publicKey")
      }
    }
  }

  async function checkPublicKey(publicKey: string) {
    if (!publicKey) {
      setPublicKeyError(null)
      return
    }
    if (await isValidPublicKey(publicKey)) {
      setPublicKeyError(null)
    } else {
      setPublicKeyError("Invalid wallet address")
    }
  }

  useEffect(() => {
    checkPublicKey(publicKey)
  }, [publicKey])

  function onSubmit() {
    if (publicKeyError || !publicKey) {
      return
    }

    router.push(`/wallet/${publicKey}`)
  }

  async function onPaste(e: any) {
    const clipboardData = e.clipboardData || (window as any).clipboardData
    const pastedData = clipboardData.getData("Text")

    if (await isValidPublicKey(pastedData)) {
      router.push(`/wallet/${pastedData}`)
    }
  }

  function onKeyDown(e: any) {
    if (e.keyCode === 13) {
      onSubmit()
    }
  }

  function clear() {
    setPublicKey("")
    router.push("/")
  }

  return (
    <TextField
      error={!!publicKeyError}
      label="Peek in any wallet"
      value={publicKey}
      onChange={(e) => setPublicKey(e.target.value)}
      helperText={publicKeyError}
      sx={{ minWidth: "350px" }}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <IconButton onClick={onSubmit} edge="start">
              <SvgIcon>
                <BinocularsIcon />
              </SvgIcon>
            </IconButton>
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={clear} edge="end" disabled={!publicKey}>
              <SvgIcon>
                <Close />
              </SvgIcon>
            </IconButton>
          </InputAdornment>
        ),
        // sx: {
        //   width: "3em",
        //   overflow: "hidden",
        //   ".MuiInputAdornment-root": {
        //     display: "none"
        //   }
        // }
      }}
    />
  )
}
