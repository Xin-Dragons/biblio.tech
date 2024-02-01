import { Box, Stack, Tab, Tabs, TextField } from "@mui/material"
import { Layout } from "../../components/Layout"
import { useEffect, useState } from "react"
import { Create } from "../../components/Create"
import { Update } from "../../components/Update"
import { PublicKey, publicKey } from "@metaplex-foundation/umi"
import { Pricing } from "../../components/Pricing"

export default function TokenTool() {
  const [mint, setMint] = useState<PublicKey | null>(null)
  const [mintAddress, setMintAddress] = useState<string>("")
  const [mintError, setMintError] = useState<string | null>(null)
  const [tab, setTab] = useState("admin")

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

  function changeTab(e: any, tab: string) {
    setTab(tab)
  }

  return (
    <Layout
      nfts={[]}
      filtered={[]}
      title="Token Tool"
      actions={
        <Stack direction="row" spacing={2} justifyContent="flex-start" alignItems="center" height="57px">
          <Tabs value={tab} onChange={changeTab}>
            <Tab label="Token Admin" value="admin" />
            <Tab label="Create New Token" value="create" />
          </Tabs>
          <Pricing tab="token-tool" />
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
      }
    >
      <Box p={4} pl={2}>
        {tab === "admin" && <Update pk={mint} />}
        {tab === "create" && <Create />}
      </Box>
    </Layout>
  )
}
