"use client"
import { Box, Stack, Tab, Tabs, TextField, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { PublicKey, publicKey } from "@metaplex-foundation/umi"
import { useWallet } from "@solana/wallet-adapter-react"

export default function TokenTool() {
  const [mint, setMint] = useState<PublicKey | null>(null)
  const [mintAddress, setMintAddress] = useState<string>("")
  const [mintError, setMintError] = useState<string | null>(null)
  const [tab, setTab] = useState("admin")
  const { data: session } = useSession()
  const wallet = useWallet()

  useEffect(() => {
    if (!mintAddress) {
      setMintError(null)
      setMint(null)
      return
    }
    try {
      const pk = publicKey(mintAddress)
      setMintError(null)
      setMint(pk)
    } catch {
      setMint(null)
      setMintError("Invalid mint address")
    }
  }, [mintAddress])

  const isAdmin = !!session?.user?.id
  const actions = (
    <Stack direction="row" spacing={2} justifyContent="flex-start" alignItems="center" height="57px">
      {tab === "admin" && (
        <Box>
          <TextField
            error={!!mintError}
            label="Token mint address"
            value={mintAddress}
            onChange={(e) => setMintAddress(e.target.value)}
            size="small"
            sx={{ my: 1 }}
          />
        </Box>
      )}
    </Stack>
  )
  return (
    <Box p={4}>
      {tab === "admin" && <Update isAdmin={isAdmin} pk={mint} />}
      {tab === "create" && <Create isAdmin={isAdmin} />}
    </Box>
  )
}
