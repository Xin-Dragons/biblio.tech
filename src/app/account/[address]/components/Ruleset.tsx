import { umi } from "@/app/helpers/umi"
import { CopyAddress } from "@/components/CopyAddress"
import { RuleSet, safeFetchRuleSet } from "@metaplex-foundation/mpl-token-auth-rules"
import { publicKey } from "@metaplex-foundation/umi"
import { Stack, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material"

const isMatch = (item: any) => Array.isArray(item) && item.length === 32 && item.every((i) => typeof i === "number")

function replacePks(obj: any) {
  if (typeof obj === "object" && !isMatch(obj)) {
    for (const keys in obj) {
      if (typeof obj[keys] === "object" && !isMatch(obj[keys])) {
        replacePks(obj[keys])
      } else if (isMatch(obj[keys])) {
        obj[keys] = publicKey(new Uint8Array(obj[keys]))
      }
    }
  }
  return obj
}

export default async function Ruleset({ data }: { data: RuleSet }) {
  data = replacePks(data)

  if (!data) {
    return <Typography variant="h2">Unknown</Typography>
  }

  const libVersion = data.latestRevision.libVersion

  return (
    <Stack>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Typography>Public key</Typography>
            </TableCell>
            <TableCell align="right">
              <CopyAddress linkPath="account">{data?.publicKey}</CopyAddress>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography>Rule set name</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{libVersion === 1 ? data.latestRevision.ruleSetName : data.latestRevision.name}</Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <pre>{JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2)}</pre>
    </Stack>
  )
}
