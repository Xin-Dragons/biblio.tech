"use client"
import { Account, RpcAccount } from "@metaplex-foundation/umi"
import { FormControlLabel, Stack, Switch } from "@mui/material"
import { useCallback, useState } from "react"

export function Client({ account, parsedAccount }: { account: RpcAccount; parsedAccount: Account<any> }) {
  const [parsed, setParsed] = useState(true)

  return (
    <Stack>
      <FormControlLabel
        control={<Switch checked={parsed} onChange={useCallback((e: any) => setParsed(e.target.checked), [])} />}
        label="Parsed"
      />
      <pre>
        {JSON.stringify(
          parsed ? parsedAccount : account,
          (key, value) => (typeof value === "bigint" ? value.toString() : value),
          2
        )}
      </pre>
    </Stack>
  )
}
