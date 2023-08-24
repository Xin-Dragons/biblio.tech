import {
  CardContent,
  Container,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from "@mui/material"
import { FEES } from "./NftTool/constants"
import { useNfts } from "./NftTool/context/nft"
import { getLevel } from "../app/tools/nft-suite/helpers"

export function Pricing({ onClose }: { onClose: Function }) {
  const { dandies } = useNfts()
  const level = getLevel(dandies.length)
  return (
    <CardContent>
      <Container maxWidth="sm">
        <Stack spacing={2}>
          <Typography variant="h4" textAlign="center" textTransform="uppercase">
            NFT Suite Pricing
          </Typography>
          <Typography textAlign="center" color="primary" width="100%">
            All prices are in SOL and per NFT.
            <br />
            Your current fee level is highlighted in{" "}
            <Typography component="span" sx={{ color: "gold.main" }}>
              gold
            </Typography>
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "basic" ? "gold.main" : "primary.main" }}>Basic</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "advanced" ? "gold.main" : "primary.main" }}>
                    Advanced (1+)
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "pro" ? "gold.main" : "primary.main" }}>Pro (5+)</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "free" ? "gold.main" : "primary.main" }}>Ultra (10+)</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography color="primary">Create</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "basic" ? "gold.main" : "default" }}>
                    {FEES.create.basic}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "advanced" ? "gold.main" : "default" }}>
                    {FEES.create.advanced}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "pro" ? "gold.main" : "default" }}>{FEES.create.pro}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "free" ? "gold.main" : "default" }}>{0}</Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography color="primary">Update</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "basic" ? "gold.main" : "default" }}>
                    {FEES.update.basic}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "advanced" ? "gold.main" : "default" }}>
                    {FEES.update.advanced}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "pro" ? "gold.main" : "default" }}>{FEES.update.pro}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "free" ? "gold.main" : "default" }}>{0}</Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography color="primary">Batch</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "basic" ? "gold.main" : "default" }}>
                    {FEES.batch.basic}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "advanced" ? "gold.main" : "default" }}>
                    {FEES.batch.advanced}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "pro" ? "gold.main" : "default" }}>{FEES.batch.pro}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: level === "free" ? "gold.main" : "default" }}>{0}</Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Button onClick={() => onClose()}>Dismiss</Button>
        </Stack>
      </Container>
    </CardContent>
  )
}
