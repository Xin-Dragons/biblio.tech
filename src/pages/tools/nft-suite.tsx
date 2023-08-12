import { Box, Stack, Tab, Tabs, TextField } from "@mui/material"
import { Layout } from "../../components/Layout"
import { useEffect, useState } from "react"
import { Create } from "../../components/Create"
import { Update } from "../../components/Update"
import { useSession } from "next-auth/react"
import { PublicKey, publicKey } from "@metaplex-foundation/umi"
import { CreateNft } from "../../components/NftTool/Create"
import { UpdateNft } from "../../components/NftTool/Update"
import { BatchUpdateNfts } from "../../components/NftTool/Batch"
import { UmiProvider } from "../../components/NftTool/context/umi"
import { NftsProvider } from "../../components/NftTool/context/nft"

export default function TokenTool() {
  const [mint, setMint] = useState<PublicKey | null>(null)
  const [mintAddress, setMintAddress] = useState<string>("")
  const [mintError, setMintError] = useState<string | null>(null)
  const [tab, setTab] = useState("create")
  const { data: session } = useSession()

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

  const isAdmin = !!session?.user?.id
  return (
    <UmiProvider>
      <NftsProvider>
        <Layout
          nfts={[]}
          filtered={[]}
          title="NFT Suite"
          actions={
            <Stack direction="row" spacing={2} justifyContent="flex-start" alignItems="center" height="57px">
              <Tabs value={tab} onChange={changeTab}>
                <Tab label="Create New NFT" value="create" />
                <Tab label="Update NFT" value="update" />
                <Tab label="Batch update NFTs" value="batch" />
              </Tabs>
            </Stack>
          }
        >
          <Box p={4} pl={2}>
            {tab === "create" && <CreateNft />}
            {tab === "update" && <UpdateNft />}
            {tab === "batch" && <BatchUpdateNfts />}
          </Box>
        </Layout>
      </NftsProvider>
    </UmiProvider>
  )
}
