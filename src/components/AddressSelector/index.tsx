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
} from "@mui/material"
import { FC, FormEvent, useEffect, useState } from "react"
import { useWallets } from "../../context/wallets"
import { PublicKey } from "@solana/web3.js"
import { toast } from "react-hot-toast"
import { shorten } from "../../helpers/utils"

type Wallet = {
  inputValue?: string
  publicKey?: string
  nickname?: string
}

type AddressSelectorProps = {
  wallet: Wallet | null
  setWallet: Function
}

const filter = createFilterOptions<Wallet>({ stringify: (opt) => `${opt.nickname}${opt.publicKey}` })

export const AddressSelector: FC<AddressSelectorProps> = ({ wallet, setWallet }) => {
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null)
  const { wallets, addWallet }: { wallets: Wallet[]; addWallet: Function } = useWallets()
  const [open, toggleOpen] = useState(false)
  const [dialogValue, setDialogValue] = useState({
    publicKey: "",
    nickname: "",
  })

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

  return (
    <>
      <Autocomplete
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
          console.log(filtered)

          if (params.inputValue !== "" && !filtered.some((item) => item.publicKey === params.inputValue)) {
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
        renderOption={(props, option) => (
          <li {...props}>
            <Stack>
              <Typography>{option.nickname || "Unnamed wallet"}</Typography>
              <FormHelperText>{option.publicKey && shorten(option.publicKey)}</FormHelperText>
            </Stack>
          </li>
        )}
        freeSolo
        renderInput={(params) => <TextField {...params} label="Recipient" />}
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
