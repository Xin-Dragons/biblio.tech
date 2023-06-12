import { Close, Search } from "@mui/icons-material"
import { IconButton, InputAdornment, SvgIcon, TextField } from "@mui/material"
import { Connection, PublicKey } from "@solana/web3.js"
import { useRouter } from "next/router"
import { FC, useEffect, useState } from "react"
import BinocularsIcon from "./binoculars.svg"
import { getDomainKeySync, NameRegistryState, getTwitterRegistry } from "@bonfida/spl-name-service"

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "confirmed" })

export async function getPublicKeyFromSolDomain(domain: string): Promise<string> {
  try {
    const { pubkey } = getDomainKeySync(domain)
    const owner = (await NameRegistryState.retrieve(connection, pubkey)).registry.owner.toBase58()
    console.log({ owner })
    return owner
  } catch {
    try {
      console.log("looking up", domain)
      const registry = await getTwitterRegistry(connection, domain)
      console.log(registry)
      const owner = registry.owner.toBase58()
      console.log({ owner })
      return owner
    } catch (err) {
      console.log(err)
      throw new Error("Nope")
    }
  }
}

type WalletSearchProps = {
  large?: boolean
}

export const WalletSearch: FC<WalletSearchProps> = ({ large }) => {
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
      } catch (err) {
        console.log(err)
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
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      size={large ? "medium" : "small"}
      sx={{ minWidth: "150px" }}
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
