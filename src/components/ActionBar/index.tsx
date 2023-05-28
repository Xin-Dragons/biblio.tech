import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  SvgIcon,
  Switch,
  TextField,
  Theme,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material"
import { debounce, uniq, flatten, intersection } from "lodash"
import Link from "next/link"
import { FC, useEffect, useState } from "react"
import { useSelection } from "../../context/selection"
import StarIcon from "@mui/icons-material/Star"

import InfoIcon from "@mui/icons-material/Info"
import { useUiSettings } from "../../context/ui-settings"
import { useFilters } from "../../context/filters"
import ClearIcon from "@mui/icons-material/Clear"
import { chunkBy } from "chunkier"
import { Search } from "../Search"
import SellIcon from "@mui/icons-material/Sell"
import dynamic from "next/dynamic"
import SendIcon from "@mui/icons-material/Send"
import { AttachMoney, Label, LabelOff, LocalFireDepartment, Public, SmartphoneOutlined } from "@mui/icons-material"
import { toast } from "react-hot-toast"
import { useTags } from "../../context/tags"

import { Connection, PublicKey } from "@solana/web3.js"

import { useMetaplex } from "../../context/metaplex"
import { Metadata, toBigNumber } from "@metaplex-foundation/js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useAccess } from "../../context/access"
import { fromWeb3JsInstruction, fromWeb3JsPublicKey, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters"
import FilterAltIcon from "@mui/icons-material/FilterAlt"
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff"
import LabelIcon from "@mui/icons-material/Label"
import {
  createBurnInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  revoke,
} from "@solana/spl-token"
import {
  DigitalAsset,
  DigitalAssetWithToken,
  TokenStandard,
  burnNft,
  burnV1,
  delegateUtilityV1,
  fetchDigitalAsset,
  fetchDigitalAssetByMetadata,
  fetchDigitalAssetWithAssociatedToken,
  fetchDigitalAssetWithToken,
  fetchDigitalAssetWithTokenByMint,
  fetchMasterEdition,
  fetchMetadata,
  findMasterEditionPda,
  findMetadataPda,
  findTokenRecordPda,
  isNonFungible,
  lockV1,
  revokeUtilityV1,
  transferV1,
  unlockV1,
} from "@metaplex-foundation/mpl-token-metadata"
import { useUmi } from "../../context/umi"
import {
  Instruction,
  Transaction,
  TransactionBuilder,
  base58PublicKey,
  isSome,
  publicKey,
  signAllTransactions,
  some,
  transactionBuilder,
  unwrapSome,
} from "@metaplex-foundation/umi"
import { useTransactionStatus } from "../../context/transactions"
import { useDatabase } from "../../context/database"
import { useRouter } from "next/router"
import { shorten } from "../Item"
import { BN } from "bn.js"
import { createSignerFromWalletAdapter } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { Collection, Nft } from "../../db"
import ImageIcon from "@mui/icons-material/Image"
import { TagList } from "../TagList"
import { Filters } from "../Filters"
import { Actions } from "../Actions"

export const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
)

type ActionBarProps = {
  nfts: any
  filtered: any
}

export const ActionBar: FC<ActionBarProps> = () => {
  const [showTags, setShowTags] = useState<boolean>(false)
  const { isAdmin } = useAccess()
  const wallet = useWallet()
  const router = useRouter()

  useEffect(() => {
    if (!router.query.collectionId && !router.query.tag && !router.query.filter) {
      setShowTags(false)
    }
  }, [router.query])

  // useEffect(() => {
  //   const options = [];
  //   const total = nfts.length;
  //   for (let rows = 1; rows <= total; rows++) {
  //     const cols = total / rows;
  //     const remainder = total - (Math.floor(cols) * rows);
  //     options.push([rows, Math.floor(cols), remainder])
  //   }

  //   setCollageOptions(options)
  // }, [nfts.length])

  // useEffect(() => {
  //   const items = selected.length || filtered.length
  //   const rows = Math.ceil(items / 3)
  //   const cols = Math.ceil(items / rows)
  //   console.log({ rows, cols })
  // }, [filtered, selected])

  const filtersShowing = useMediaQuery("(min-width:1300px)")

  return (
    <Container maxWidth={false}>
      <Stack direction="column">
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
          sx={{ padding: "0.5em 0 0.5em 0" }}
        >
          {wallet.connected && (
            <>
              <Actions />
              <Filters showTags={showTags} setShowTags={setShowTags} />
            </>
          )}
        </Stack>
        {isAdmin && (
          <Stack direction="row" justifyContent="flex-end">
            {showTags && filtersShowing && <TagList clip />}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
