import {
  Autocomplete,
  Stack,
  Typography,
  FormHelperText,
  TextField,
  Dialog,
  Card,
  CardContent,
  DialogContentText,
  Button,
  createFilterOptions,
  IconButton,
  Tooltip,
} from "@mui/material"
import { FC, FormEvent, useEffect, useState } from "react"
import { useWallets } from "../../context/wallets"
import { PublicKey } from "@solana/web3.js"
import { toast } from "react-hot-toast"
import { getAddressType, isValidPublicKey, shorten } from "../../helpers/utils"
import { isPublicKey, publicKey } from "@metaplex-foundation/umi"
import { isAddress } from "viem"
import { useSession } from "next-auth/react"
import { orderBy, uniqBy } from "lodash"
import { Close } from "@mui/icons-material"
import { Wallet } from "../../db"

type AddressSelectorProps = {
  wallet: Wallet | null
  setWallet: Function
  addDialog?: boolean
  onNotFound?: Function
  [x: string]: any
}

const filter = createFilterOptions<Wallet>({ stringify: (opt) => `${opt.nickname}${opt.publicKey}` })

export const AddressSelector: FC<AddressSelectorProps> = ({
  wallet,
  setWallet,
  addDialog = true,
  onNotFound,
  ...props
}) => {
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null)
  const {
    wallets: addressBookWallets,
    addWallet,
    deleteWallet,
  }: { wallets: Wallet[]; addWallet: Function; deleteWallet: Function } = useWallets()
  const { data: session } = useSession()

  const [open, toggleOpen] = useState(false)
  const [dialogValue, setDialogValue] = useState({
    publicKey: "",
    nickname: "",
  })

  const linkedWallets =
    session?.user?.wallets?.map((w) => {
      const addressBookWallet = addressBookWallets.find((a) => a.publicKey === w.public_key)
      return {
        publicKey: w.public_key,
        chain: w.chain,
        nickname: addressBookWallet?.nickname || null,
        added: Date.parse(w.created_at),
      } as Wallet
    }) || []

  const wallets = orderBy(
    uniqBy([...addressBookWallets, ...linkedWallets], (item) => item.publicKey),
    (item) => item.added || -1,
    "desc"
  )

  useEffect(() => {
    if (!dialogValue.publicKey) {
      setPublicKeyError(null)
      return
    }
    try {
      const pk = new PublicKey(dialogValue.publicKey)
      setPublicKeyError(null)
    } catch {
      setPublicKeyError("Invalid public key")
    }
  }, [dialogValue.publicKey])

  const handleClose = () => {
    setDialogValue({
      publicKey: "",
      nickname: "",
    })
    toggleOpen(false)
  }

  function setInitialDialogValue(value: string) {
    if (onNotFound) {
      return onNotFound(value)
    }
    let isPublicKey = false
    try {
      const pk = new PublicKey(value)
      isPublicKey = true
    } catch {
      isPublicKey = false
    }
    toggleOpen(true)
    setDialogValue({
      publicKey: isPublicKey ? value : "",
      nickname: isPublicKey ? "" : value,
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      if (publicKeyError) {
        throw new Error("Invalid public key")
      }
      if (wallets.map((w) => w.publicKey).includes(dialogValue.publicKey)) {
        throw new Error("Public key already exists")
      }
      await addWallet(dialogValue.publicKey, dialogValue.nickname)
      setWallet({
        publicKey: dialogValue.publicKey,
        nickname: dialogValue.nickname,
      })
      handleClose()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const removeItem = (wallet: Wallet) => async (e: any) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      if (!wallet.autoAdded) {
        throw new Error("Cannot remove Address Book items, use the Address Book section in the Profile menu")
      }

      await deleteWallet(wallet.publicKey)
    } catch (err: any) {
      toast.error(err.message || "Error removing item from history")
    }
  }

  return (
    <>
      <Autocomplete
        {...props}
        value={wallet}
        onChange={(event, newValue) => {
          if (typeof newValue === "string") {
            // timeout to avoid instant validation of the dialog's form.
            setTimeout(() => {
              setInitialDialogValue(newValue)
            })
          } else if (newValue && newValue.inputValue) {
            setInitialDialogValue(newValue.inputValue)
          } else {
            setWallet(newValue)
          }
        }}
        filterOptions={(options, params) => {
          const filtered = filter(options, params)

          if (addDialog && params.inputValue !== "" && !filtered.some((item) => item.publicKey === params.inputValue)) {
            filtered.push({
              inputValue: params.inputValue,
              nickname: `Add "${params.inputValue}"`,
            })
          }

          return filtered
        }}
        options={wallets}
        getOptionLabel={(option) => {
          // e.g value selected with enter, right from the input
          if (typeof option === "string") {
            return option
          }
          if (option.inputValue) {
            return option.inputValue
          }
          return option.publicKey!
        }}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        renderOption={(p, option) => {
          return (
            <li {...p}>
              <Stack width="100%">
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography>{option.nickname || "Unnamed wallet"}</Typography>
                  {props.deletable && option.autoAdded && (
                    <Tooltip title="Remove from history">
                      <Close
                        fontSize="small"
                        color="disabled"
                        sx={{ "&:hover": { color: "white" } }}
                        onClick={removeItem(option as Wallet)}
                      />
                    </Tooltip>
                  )}
                </Stack>
                <Stack direction="row" justifyContent="space-between" width="100%">
                  <FormHelperText>{option.publicKey && shorten(option.publicKey)}</FormHelperText>
                  {props.showChain && <FormHelperText>{getAddressType(option.publicKey as string)}</FormHelperText>}
                </Stack>
              </Stack>
            </li>
          )
        }}
        freeSolo
        renderInput={(params) => <TextField {...params} label={props.label || "Recipient"} />}
      />
      <Dialog open={open} onClose={handleClose} fullWidth>
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <Typography variant="h5">Add new wallet</Typography>
                <DialogContentText>Add a new wallet as a recipient</DialogContentText>
                <TextField
                  autoFocus
                  margin="dense"
                  id="name"
                  value={dialogValue.nickname}
                  onChange={(event) =>
                    setDialogValue({
                      ...dialogValue,
                      nickname: event.target.value,
                    })
                  }
                  label="Nickame"
                />
                <TextField
                  margin="dense"
                  id="name"
                  error={!!publicKeyError}
                  helperText={publicKeyError}
                  value={dialogValue.publicKey}
                  onChange={(event) =>
                    setDialogValue({
                      ...dialogValue,
                      publicKey: event.target.value,
                    })
                  }
                  label="Public key"
                />
                <Stack direction="row" justifyContent="space-between">
                  <Button onClick={handleClose} color="error">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!dialogValue.publicKey || !!publicKeyError} variant="contained">
                    Add
                  </Button>
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Dialog>
    </>
  )
}
