import { Nft, Sft, walletAdapterIdentity } from "@metaplex-foundation/js";
import { Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, ThemeProvider, Typography, createTheme } from "@mui/material";
import { createBurnInstruction, createCloseAccountInstruction, getAssociatedTokenAddress, getMint } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { flatten, uniq } from "lodash";
import { FC, useEffect, useState } from "react";
import { useMetaplex } from "../../context/metaplex";
import { useSelection } from "../../context/selection";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Sidebar } from "../Sidebar";
import { toast } from "react-hot-toast";
import { useDatabase } from "../../context/database";
import { Close, LocalFireDepartment, TakeoutDining } from "@mui/icons-material";
import { useTags } from "../../context/tags";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/router";
import { useTheme } from "../../context/theme";
import { useUiSettings } from "../../context/ui-settings";

const { palette } = createTheme();


export const SelectedMenu: FC = ({ filtered }) => {
  const {selectedMenuShowing, setSelectedMenuShowing} = useUiSettings()
  const { selected, setSelected } = useSelection();
  const wallet = useWallet()
  const metaplex = useMetaplex().use(walletAdapterIdentity(wallet));
  const { connection } = useConnection();
  const [recipient, setRecipient] = useState("");
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const { deleteNfts } = useDatabase();
  const [ selectedTag, setSelectedTag ] = useState("");
  const { db } = useDatabase(0);
  const router = useRouter()
  const theme = useTheme();

  function toggleSelectedMenuShowing() {
    setSelectedMenuShowing(!selectedMenuShowing);
  }

  useEffect(() => {
    const toDeselect = selected.filter(s => !filtered.map(n => n.nftMint).includes(s))
    if (toDeselect.length) {
      setSelected(prev => {
        return prev.filter(item => !toDeselect.includes(item))
      })
    }
  }, [filtered])

  const taggedNfts = useLiveQuery(() => db && db
    .taggedNfts
    .toArray(),
    [db, filtered],
    []
  ) || []

  const { tags, addNftsToTag, removeNftsFromTag } = useTags()

  function toggleBulkSendOpen() {
    setBulkSendOpen(!bulkSendOpen)
  }

  const mints = filtered.map(n => n.nftMint)

  async function freeze() {
    try {
      const toFreeze = await Promise.all(filtered.filter(n => selected.includes(n.nftMint)).map(nft => metaplex.nfts().findByMint({ mintAddress: new PublicKey(nft.nftMint) })));
      // const mint = await connection.getParsedAccountInfo(nfts[0].mint.address)
      // const address = await getAssociatedTokenAddress(new PublicKey(toFreeze[0].nftMint), wallet.publicKey)
      // const token = await metaplex.tokens().findTokenByAddress({
      //   address
      // })
      // console.log(token.delegateAddress?.toBase58())
      const instructions = flatten(toFreeze.map((nft: Nft) => {

        console.log(nft)
        
        const inst = []
        inst.push(
          metaplex
            .nfts()
            .builders()
            .delegate({
              nftOrSft: nft,
              delegate: {
                type: "UtilityV1",
                delegate: wallet.publicKey!,
                owner: wallet.publicKey!,
                data: {
                  amount: 1
                }
              },
              authorizationDetails: {
                rules: nft.programmableConfig?.ruleSet
              }
            }).getInstructions()
          )
      
        inst.push(metaplex.nfts().builders().lock({
          nftOrSft: nft,
          authority: {
            owner: wallet.publicKey as PublicKey,
            type: "UtilityV1",
            delegate: metaplex.identity(),
            __kind: "tokenDelegate"
          }
        }).getInstructions())

        return flatten(inst)
      }))
  
      const txn = new Transaction().add(...instructions)
      txn.feePayer = wallet.publicKey as PublicKey;
      txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
      const signed = await wallet.signTransaction?.(txn);
      await connection.sendRawTransaction(signed.serialize())
    } catch (err) {
      console.log(err)
    }
  }

  const allSelected = selected.length >= filtered.length

  function selectAll() {
    setSelected(prevState => {
      return uniq([
        ...prevState,
        ...mints
      ])
    })
  }

  function deselectAll() {
    setSelected([])
  }

  function cancelSend() {
    setRecipient("")
    setBulkSendOpen(false);
  }

  async function burn() {
    try {
      const toBurn = await Promise.all(
        filtered
          .filter(n => selected.includes(n.nftMint))
          .map(nft => metaplex.nfts().findByMint({ mintAddress: new PublicKey(nft.nftMint) }))
      );
  
      const instructions = await Promise.all(toBurn.map(async (nft: Nft | Sft) => {
        console.log(nft)
        if (nft.tokenStandard === 1) {
          const ata = await getAssociatedTokenAddress(nft.mint.address, wallet.publicKey!)
          return [
            createBurnInstruction(
              ata,
              nft.mint.address,
              wallet.publicKey!,
              1
            ),
            createCloseAccountInstruction(
              ata,
              wallet.publicKey!,
              wallet.publicKey!
            )
          ]
        }

        return metaplex
          .nfts()
          .builders()
          .delete({
            mintAddress: nft.address,
            collection: nft.collection?.address
          })
          .getInstructions()
      }))
      const txn = new Transaction().add(...flatten(instructions))
      txn.feePayer = wallet.publicKey as PublicKey;
      txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
      const signed = await wallet.signTransaction?.(txn);
      await connection.sendRawTransaction(signed.serialize())
      const burned = toBurn.map(n => n.mint.address.toBase58());
      await deleteNfts(burned)
      setSelected(selected.filter(s => !burned.includes(s)))
      toast.success("Burned that shit")
    } catch (err) {
      toast.error(err.message)
    } finally {

    }
  }

  async function addTag(tag) {
    try {
      await addNftsToTag(tag.id, selected);
      toast.success(`Added NFT${selected.length === 1 ? '' : 's'} to ${tag.name}`)
    } catch (err) {

    } finally {

    }
  }

  async function removeTag(tag) {
    try {
      await removeNftsFromTag(tag.id, selected)
      toast.success(`Removed NFT${selected.length === 1 ? '' : 's'} from ${tag.name}`)
    } catch {

    } finally {

    }
  }

  return (
    <Box sx={{
      transition: "opacity 0.1s",
      position: "fixed",
      width: "40vw",
      marginLeft: "30vw",
      zIndex: 1000,
      bottom: "5em",
      background: "rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(10px)",
      borderRadius: "10px",
      padding: 2,
      opacity: selectedMenuShowing ? 1 : 0,
      pointerEvents: selectedMenuShowing ? "all" : "none",
      border: '2px solid white'
    }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h4">
                Selection
              </Typography>
              <Typography>{selected.length} Selected</Typography>
            </Stack>
            <Stack spacing={2} direction="row">
              <Button onClick={selectAll} disabled={!filtered.length || allSelected}>Select all</Button>
              <Button onClick={deselectAll} disabled={!filtered.length || !selected.length}>Deselect all</Button>
              <IconButton size="medium" onClick={toggleSelectedMenuShowing}>
                <Close fontSize="large" />
              </IconButton>
            </Stack>
            
          </Stack>
          
          {/* <Typography variant="h6">Tags</Typography> */}
          <Stack direction="row" spacing={0} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {
              tags.map(tag => {
                if (!theme.palette[tag.id]) {
                  return null
                }
                const selectedNfts = taggedNfts.filter(n => n.tagId === tag.id).map(n => n.nftId)
                const isSelected = selected.length && selected.every(mint => selectedNfts.includes(mint))

                return (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    onDelete={() => isSelected ? removeTag(tag) : addTag(tag)}
                    onClick={() => router.push(`/tag/${tag.id}`)}
                    variant={isSelected ? "contained" : "outlined"}
                    deleteIcon={!isSelected && <AddCircleIcon />}
                    disabled={!selected.length}
                    color={tag.id}
                    />
                  )
              })
            }
            <Chip
              label="Add to new tag"
              disabled={!selected.length}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button onClick={burn} variant="outlined" color="error" disabled={!selected.length} startIcon={<LocalFireDepartment />}>BURN</Button>
            <Button onClick={freeze} variant="outlined" disabled={!selected.length}>Send to Vault</Button>
            <Button onClick={toggleBulkSendOpen} variant="contained" disabled={!selected.length}>Bulk send</Button>
          </Stack>
        </Stack>
        <Dialog open={bulkSendOpen} onClose={toggleBulkSendOpen}>
          <DialogTitle>Bulk send</DialogTitle>
          <DialogContent>
            <TextField 
              label="Recipient"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              sx={{ minWidth: "400px" }}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelSend} color="error">Cancel</Button>
            <Button onClick={toggleBulkSendOpen} variant="contained" disabled={!recipient || !selected.length}>Send</Button>
          </DialogActions>
        </Dialog>
    </Box>
  )
}