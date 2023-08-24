"use client"

import { Grid, Card, CardContent, Stack, Typography, CircularProgress, TextField, Button } from "@mui/material"
import { PublicKey } from "@solana/web3.js"
import axios from "axios"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"

export default function Token({ cardStyles, cardContentStyles }: { cardStyles: any; cardContentStyles: any }) {
  const [publicKey, setPublicKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [publicKeyError, setPublicKeyError] = useState(null)

  useEffect(() => {
    if (!publicKey) {
      setPublicKeyError(null)
      return
    }
    try {
      const valid = PublicKey.isOnCurve(publicKey)
      if (!valid) {
        throw new Error("Invalid public key")
      }
    } catch (err: any) {
      setPublicKeyError(err.message)
    }
  }, [publicKey])

  async function takeSnap() {
    try {
      setLoading(true)

      const params = {
        jsonrpc: "2.0",
        id: 1,
        method: "getProgramAccounts",
        params: [
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          {
            encoding: "jsonParsed",
            filters: [
              {
                dataSize: 165,
              },
              {
                memcmp: {
                  offset: 0,
                  bytes: publicKey,
                },
              },
            ],
          },
        ],
      }

      const headers = {
        "Content-Type": "application/json",
      }

      const result = await axios.post(process.env.NEXT_PUBLIC_RPC_HOST!, params, { headers })
      const mapped = result.data.result
        .map((item: any) => {
          return {
            address: item.account.data.parsed.info.owner,
            amount: item.account.data.parsed.info.tokenAmount.uiAmount,
          }
        })
        .filter((item: any) => item.amount)
        .sort((a: any, b: any) => b.amount - a.amount)

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapped, null, 2))
      const download = document.createElement("a")
      download.setAttribute("href", dataStr)
      download.setAttribute("download", `token_holders_${publicKey}_${Date.now()}.json`)
      download.click()
    } catch (err: any) {
      toast.error(err.message || "Error taking snap")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Card sx={cardStyles} className="box">
          <CardContent sx={cardContentStyles}>
            <Stack spacing={2}>
              <Stack spacing={2} direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h4">SPL token holders</Typography>
                {loading && <CircularProgress />}
              </Stack>
              <Stack spacing={2} direction="row">
                <TextField
                  label="Token mint"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  error={!!publicKeyError}
                  helperText={publicKeyError}
                  fullWidth
                />
                <Button
                  variant="contained"
                  sx={{ backgroundColor: "#154E55", color: "white", whiteSpace: "nowrap" }}
                  disabled={loading || !publicKey || !!publicKeyError}
                  onClick={takeSnap}
                >
                  Take snap
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
