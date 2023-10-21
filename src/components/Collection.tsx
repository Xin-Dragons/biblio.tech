"use client"

import { useSelection } from "@/context/selection"
import { useUiSettings } from "@/context/ui-settings"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material"
import NextLink from "next/link"
import { fontSizes, iconSizes, margins } from "./DigitalAsset"
import { ImageWithFallback } from "./ImageWithFallback"
import { Diamond, Edit } from "@mui/icons-material"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useState } from "react"
import { bigNumberFormatter, lamportsToSol } from "@/helpers/utils"
import { orderBy } from "lodash"
import { useParams } from "next/navigation"

function getColor(num: number) {
  if (num > 100) {
    return "error"
  }
  if (num > 50) {
    return "warning"
  }
  if (num > 10) {
    return "gold"
  }
  return "info"
}

function camelToName(name: string) {
  let reFindHumps = /([A-Z]){1}([a-z0-9]){1}/g
  let re1stLower = /^[a-z]{1}/
  let label = name.replace(reFindHumps, " $1$2")

  if (re1stLower.test(label)) {
    label = label.substr(0, 1).toUpperCase() + label.substring(1).toLowerCase()
  }
  return label
}

export function Collection({ item, edit }: { item: any; edit?: boolean }) {
  const [editValueShowing, setEditValueShowing] = useState(false)
  const [confirmShowing, setConfirmShowing] = useState(false)
  const { publicKey } = useParams()
  const { layoutSize, zenMode } = useUiSettings()

  function toggleConfirmShowing() {
    setConfirmShowing(!confirmShowing)
  }

  function toggleEditValueShowing() {
    setEditValueShowing(!editValueShowing)
  }

  async function markAllAsFloor() {
    await Promise.all(item.mints.map((mint) => mint.updateValuationMethod("floor")))
  }

  let basePath = "/wallet"
  if (publicKey) {
    basePath = `${basePath}/${publicKey}`
  }

  return (
    <Link component={NextLink} underline="none" href={`${basePath}?collection=${item.id}`}>
      <Card
        sx={{
          margin: margins[layoutSize as keyof typeof margins],
          zIndex: 999,
          position: "relative",
        }}
      >
        <ImageWithFallback src={item.imageUri || item.mints.find((mint) => mint.estimatedValue)?.image} />
        {!zenMode && (
          <CardContent sx={{ position: "relative" }}>
            <Stack
              sx={{
                position: "absolute",
                top: "-15px",
                width: "calc(100% - 1em)",
                right: "0.5em",
              }}
              direction={"row"}
              justifyContent={"space-between"}
              alignItems={"center"}
              spacing={1}
            >
              <Chip label={item.mints?.length} size="small" color="primary" sx={{ fontWeight: "bold" }} />
            </Stack>
            <Stack spacing={2}>
              <Stack direction="row">
                <Typography
                  textTransform="uppercase"
                  fontWeight="bold"
                  variant={fontSizes[layoutSize as keyof typeof fontSizes] as any}
                  sx={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}
                >
                  {item.name || "Unnamed item"}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Diamond sx={{ color: "#baf2ef", width: iconSizes[layoutSize as keyof typeof iconSizes] }} />
                  <Typography variant={fontSizes[layoutSize as keyof typeof fontSizes] as any}>
                    {item.estimatedValue && `${bigNumberFormatter.format(item.estimatedValue / LAMPORTS_PER_SOL)}`}
                  </Typography>
                  {edit && (
                    <Tooltip title="Customize value">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleEditValueShowing()
                        }}
                      >
                        <Edit sx={{ color: "text.secondary", fontSize: "0.9em" }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography
                    fontWeight="bold"
                    sx={{ color: "gold.main" }}
                    variant={fontSizes[layoutSize as keyof typeof fontSizes] as any}
                  >
                    FP:
                  </Typography>
                  <Typography variant={fontSizes[layoutSize as keyof typeof fontSizes] as any}>
                    {item.floor ? `${bigNumberFormatter.format(item.floor / LAMPORTS_PER_SOL)}` : "-"}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        )}
      </Card>
      <Dialog open={editValueShowing} onClose={toggleEditValueShowing} maxWidth="md" fullWidth>
        <Card sx={{ overflowY: "auto" }}>
          <CardContent>
            <Container maxWidth="sm">
              <Stack spacing={2}>
                <Typography variant="h4" color="primary" textTransform="uppercase" textAlign="center">
                  Collection valuation
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ border: 0 }}>
                        <Typography variant="h6">Collection</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ border: 0 }}>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {item.name}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: 0 }}>
                        <Typography variant="h6">Number held</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ border: 0 }}>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {item.mints?.length}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: 0 }}>
                        <Typography variant="h6">Floor price</Typography>
                      </TableCell>
                      <TableCell sx={{ border: 0 }} align="right">
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {item.statsV2?.buyNowPrice / LAMPORTS_PER_SOL}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: 0 }}>
                        <Typography variant="h6">Floor value</Typography>
                      </TableCell>
                      <TableCell sx={{ border: 0 }} align="right">
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {item.floor / LAMPORTS_PER_SOL}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Button color="error" variant="outlined" onClick={toggleConfirmShowing}>
                  Mark all as floor
                </Button>

                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>NFT</TableCell>
                      <TableCell>Valuation</TableCell>
                      <TableCell>Variance</TableCell>
                      <TableCell>Last Sale</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderBy(item.mints, (mint) => mint.variance, "desc").map((da) => {
                      return (
                        <TableRow>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box width={50} height={50}>
                                <ImageWithFallback src={da.image} size={100} />
                              </Box>
                              <Typography>{da.name}</Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Stack>
                              <Typography>{lamportsToSol(da.estimatedValue)}</Typography>
                              <Typography color="primary" variant="body2" fontWeight="bold">
                                {da.valuationMethod
                                  ? camelToName(da.valuationMethod)
                                  : da.attributes.find((att) => att.floor)
                                  ? "Top trait"
                                  : "Floor"}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography color={getColor(item.variance)}>
                              {bigNumberFormatter.format(da.variance)}x
                            </Typography>
                          </TableCell>
                          <TableCell>{da.lastSale ? lamportsToSol(da.lastSale.price) : "Unknown"}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Stack>
            </Container>
          </CardContent>
        </Card>
      </Dialog>
      <Dialog open={confirmShowing} onClose={toggleConfirmShowing}>
        <Card>
          <CardContent>
            <Stack spacing={4}>
              <Typography variant="h5">Set all as floor</Typography>
              <Typography>All items will be valued as floor. Do you want to continue?</Typography>
              <Stack direction="row" justifyContent="space-between">
                <Button color="error" variant="outlined" onClick={toggleConfirmShowing}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={markAllAsFloor}>
                  Confirm
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
    </Link>
  )
}
