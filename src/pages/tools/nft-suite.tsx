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
import { useSession } from "next-auth/react"
import { CreateNft } from "../../components/NftTool/Create"
import { UpdateNft } from "../../components/NftTool/Update"
import { BatchUpdateNfts } from "../../components/NftTool/Batch"
import { UmiProvider } from "../../components/NftTool/context/umi"
import { NftsProvider, useNfts } from "../../components/NftTool/context/nft"
import { FEES } from "../../components/NftTool/constants"
import { getLevel } from "../../components/NftTool/helpers/utils"

export default function TokenTool() {
  const [tab, setTab] = useState("create")
  const { data: session } = useSession()
  const [pricingShowing, setPricingShowing] = useState(false)

  function togglePricing() {
    setPricingShowing(!pricingShowing)
  }

  function changeTab(e: any, tab: string) {
    setTab(tab)
  }

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
              <Button onClick={togglePricing}>Pricing</Button>
            </Stack>
          }
        >
          <Box p={4} pl={2}>
            {tab === "create" && <CreateNft />}
            {tab === "update" && <UpdateNft />}
            {tab === "batch" && <BatchUpdateNfts />}
          </Box>
        </Layout>
        <Dialog open={pricingShowing} onClose={() => setPricingShowing(false)} maxWidth="md" fullWidth>
          <Card>
            <Pricing onClose={togglePricing} />
          </Card>
        </Dialog>
      </NftsProvider>
    </UmiProvider>
  )
}

function Pricing({ onClose }: { onClose: Function }) {
  const { dandies } = useNfts()
  const level = getLevel(dandies.length)
  return (
    <CardContent>
      <Container maxWidth="sm">
        <Stack spacing={2}>
          <Typography variant="h4" textAlign="center" textTransform="uppercase">
            NFT Suite Pricing
          </Typography>
          <Typography textAlign="center" color="primary" width="100%">
            All prices are in SOL and per NFT.
            <br />
            Your current fee level is highlighted in{" "}
            <Typography component="span" sx={{ color: "gold.main" }}>
              gold
            </Typography>
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "basic" ? "gold.main" : "primary.main" }}>Basic</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "advanced" ? "gold.main" : "primary.main" }}>
                    Advanced (1+)
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "pro" ? "gold.main" : "primary.main" }}>Pro (5+)</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "free" ? "gold.main" : "primary.main" }}>Ultra (10+)</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography color="primary">Create</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "basic" ? "gold.main" : "default" }}>
                    {FEES.create.basic}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "advanced" ? "gold.main" : "default" }}>
                    {FEES.create.advanced}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "pro" ? "gold.main" : "default" }}>{FEES.create.pro}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "free" ? "gold.main" : "default" }}>{0}</Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography color="primary">Update</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "basic" ? "gold.main" : "default" }}>
                    {FEES.update.basic}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "advanced" ? "gold.main" : "default" }}>
                    {FEES.update.advanced}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "pro" ? "gold.main" : "default" }}>{FEES.update.pro}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "free" ? "gold.main" : "default" }}>{0}</Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography color="primary">Batch</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "basic" ? "gold.main" : "default" }}>
                    {FEES.batch.basic}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "advanced" ? "gold.main" : "default" }}>
                    {FEES.batch.advanced}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "pro" ? "gold.main" : "default" }}>{FEES.batch.pro}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "free" ? "gold.main" : "default" }}>{0}</Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Button onClick={() => onClose()}>Dismiss</Button>
        </Stack>
      </Container>
    </CardContent>
  )
}
