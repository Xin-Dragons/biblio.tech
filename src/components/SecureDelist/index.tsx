import { publicKey } from "@metaplex-foundation/umi"
import { CardContent, Stack, Typography, TextField, Button, Container, Alert } from "@mui/material"
import { useEffect, useState } from "react"
import { useTensor } from "../../context/tensor"
import { useSelection } from "../../context/selection"

export function SecureDelist({ onDismiss }: { onDismiss: Function }) {
  const [delistTo, setDelistTo] = useState("")
  const [delistToError, setDelistToError] = useState<null | string>(null)
  const { selected } = useSelection()
  const { delist } = useTensor()

  useEffect(() => {
    if (!delistTo) {
      setDelistToError(null)
      return
    }
    try {
      publicKey(delistTo)
      setDelistToError(null)
    } catch {
      setDelistToError("Invalid address")
    }
  }, [delistTo])

  async function onDelist() {
    onDismiss()
    // await delist(selected, delistTo)
  }

  return (
    <CardContent>
      <Container maxWidth="sm">
        <Stack spacing={2}>
          <Typography variant="h4">Secure delist</Typography>
          <Typography>
            If the wallet used to list your items has been compromised, you can elect another wallet for them to be sent
            to after they are delisted.
            <br />
            <br />
            Leave this field blank to delist to the wallet that listed the items
          </Typography>

          <TextField
            error={!!delistToError}
            label="Delist to"
            value={delistTo}
            onChange={(e) => setDelistTo(e.target.value)}
            helperText={delistToError}
          />
          {delistTo && (
            <Alert severity="info">
              Secure delist is achieved by pre-signing a transfer instruction, and then instantly submitting as soon as
              the delist is processed. As we cannot alter the delist transaction there is always a tiny chance the
              hacker could intercept the assets in the milliseconds between these events. Although extremely unlikely,
              we feel it&apos;s important to highlight this risk and offer no guarantees of success.
            </Alert>
          )}

          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Button color="error" onClick={() => onDismiss()}>
              Cancel
            </Button>
            <Button variant="contained" onClick={onDelist} size="large" disabled={!!delistToError}>
              {delistTo ? "Secure delist" : "Delist"}
            </Button>
          </Stack>
        </Stack>
      </Container>
    </CardContent>
  )
}
