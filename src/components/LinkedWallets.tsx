import { shorten, sleep } from "@/helpers/utils"
import { Check } from "@mui/icons-material"
import { Alert, Button, Chip, Stack, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import { noop } from "lodash"

export function LinkedWallets() {
  const { owned, addWallet, removeWallet } = {
    owned: [],
    addWallet: noop,
    removeWallet: noop,
  }
  const wallet = useWallet()

  async function link() {
    addWallet({
      publicKey: wallet.publicKey?.toBase58(),
      owned: true,
    })
  }

  async function unlink(wallet: string) {
    removeWallet(wallet)
  }

  const connectedIsLinked = owned.find((item) => item.publicKey === wallet.publicKey?.toBase58())

  async function reconnect() {
    await wallet.disconnect()
    await sleep(1000)
    await wallet.connect()
  }

  if (!wallet.connected) {
    return <Typography>Disconnected</Typography>
  }

  return (
    <Stack spacing={2}>
      <Typography>Change wallets using your browser wallet extension and link additional wallets below</Typography>

      <Alert severity="info">
        If you are using Phantom and the wallet change isn't detected, try enabling "Multi-chain" mode.
        <br />
        <br />
        If this still doesn't work (imported wallets), disconnect and reconnect using the wallet menu in the top right.
      </Alert>

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack>
          <Typography>Linking:</Typography>
          <Typography color="primary" fontWeight="bold" variant="h6">
            {shorten(wallet.publicKey?.toBase58())}
          </Typography>
        </Stack>
        {connectedIsLinked ? (
          <Typography>Already linked</Typography>
        ) : (
          <Stack>
            <Button onClick={link} variant="contained">
              Link
            </Button>
          </Stack>
        )}
      </Stack>
      {owned.length ? (
        <Table>
          <TableBody>
            {owned.map((wallet) => (
              <TableRow>
                <TableCell>
                  <Typography>{shorten(wallet.publicKey)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label="linked"
                    onDelete={() => unlink(wallet.publicKey)}
                    color="success"
                    sx={{ textTransform: "uppercase", fontWeight: "bold" }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Alert severity="info">No linked wallets</Alert>
      )}
    </Stack>
  )
}
