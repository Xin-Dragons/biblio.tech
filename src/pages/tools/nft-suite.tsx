import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import { Layout } from "../../components/Layout"
import { useEffect, useState } from "react"
import { CreateNft } from "../../components/NftTool/Create"
import { UpdateNft } from "../../components/NftTool/Update"
import { UmiProvider } from "../../components/NftTool/context/umi"
import { NftsProvider, useNfts } from "../../components/NftTool/context/nft"
import { FEES } from "../../components/NftTool/constants"
import { getLevel } from "../../components/NftTool/helpers/utils"
import { Pricing } from "../../components/Pricing"
import { TxsProvider } from "../../context/txs"
import { BatchUpdateNfts } from "../../components/NftTool/Batch"

export default function TokenTool() {
  const [tab, setTab] = useState("create")

  function changeTab(e: any, tab: string) {
    setTab(tab)
  }

  return (
    <UmiProvider>
      <NftsProvider>
        <TxsProvider>
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
                <Pricing tab="nft-suite" />
              </Stack>
            }
          >
            <Box p={4} pl={2}>
              {tab === "create" && <CreateNft />}
              {tab === "update" && <UpdateNft />}
              {tab === "batch" && <BatchUpdateNfts />}
            </Box>
          </Layout>
        </TxsProvider>
      </NftsProvider>
    </UmiProvider>
  )
}
