import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  List,
  ListItem,
  MenuItem,
  Select,
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
import { useUmi } from "../../context/umi"
import { publicKey as publicKeySerializer } from "@metaplex-foundation/umi/serializers"

import * as Auth from "@metaplex-foundation/mpl-token-auth-rules"

import {
  fetchAllRuleSet,
  MPL_TOKEN_AUTH_RULES_PROGRAM_ID,
  createOrUpdateV1,
  findRuleSetPda,
  RuleSetRevisionV2,
  isRuleSetV1,
  getRuleSetRevisionSerializer,
  RuleV1,
  RuleV2,
  Key,
} from "@metaplex-foundation/mpl-token-auth-rules"

import type { RuleSet } from "@metaplex-foundation/mpl-token-auth-rules"
import { useConnection } from "@solana/wallet-adapter-react"
import { toast } from "react-hot-toast"
import { isAllRuleV1 } from "@metaplex-foundation/mpl-token-auth-rules/dist/src/revisions/v1/all"
import { shorten } from "../../helpers/utils"
import { publicKey, some } from "@metaplex-foundation/umi"
import { map, omit } from "lodash"
import { Create } from "../../components/RuleSets/Create"
import { Update } from "../../components/RuleSets/Update"

export default function RuleSets() {
  const [tab, setTab] = useState("create")
  return (
    <Layout
      nfts={[]}
      filtered={[]}
      title="Rule set manager"
      actions={
        <Stack direction="row" spacing={2} justifyContent="flex-start" alignItems="center" height="57px">
          <Tabs value={tab} onChange={(e, tab) => setTab(tab)}>
            <Tab label="Create New RuleSet" value="create" />
            <Tab label="My RuleSets" value="manage" />
          </Tabs>
          {/* <Button onClick={togglePricing}>Pricing</Button> */}
        </Stack>
      }
    >
      <Box p={4} pl={2}>
        {tab === "create" && <Create />}
        {tab === "manage" && <Update />}
      </Box>
    </Layout>
  )
}
