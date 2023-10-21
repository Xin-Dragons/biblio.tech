"use client"
import {
  Stack,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  Table,
  TableBody,
  Box,
  CircularProgress,
  TableCell,
  TableRow,
  TableHead,
  Link,
  Chip,
  Tooltip,
} from "@mui/material"
import NextLink from "next/link"
import { useEffect, useState } from "react"
import { getSmartMoney } from "./get-smart-money"
import { usePrevious } from "@/hooks/use-previous"
import { InfoOutlined } from "@mui/icons-material"

function Collection({
  collection,
  index,
  days,
  isSmartMoney,
}: {
  collection: any
  index: number
  days: number
  isSmartMoney: boolean
}) {
  const image = collection.digitalAsset?.content?.links?.image || collection.sample_image

  const collectionId = collection.collectionMint || collection.id

  return (
    <TableRow>
      <TableCell>
        <Chip label={index + 1} />
      </TableCell>

      <TableCell>
        <Link href={`/collection/${collectionId}`} component={NextLink} underline="hover">
          <Stack direction="row" spacing={1} alignItems="center">
            <img
              src={image ? `https://img-cdn.magiceden.dev/rs:fill:100:100:0:0/plain/${image}` : "/books-lightest.svg"}
              width={50}
            />
            <Typography>{collection.name}</Typography>
          </Stack>
        </Link>
      </TableCell>

      {/* <TableCell>
        <Typography
          fontWeight="bold"
          sx={{ color: collection.nrt_volume_percent_change > 0 ? "success.main" : "error.main" }}
        >
          {(collection.nrt_volume_percent_change * 100).toLocaleString()}%
        </Typography>
      </TableCell>
      <TableCell>
        {isSmartMoney ? (
          <Typography>
            {(days === 1 ? collection.smart_money_inflow_24h : collection.smart_money_inflow_7d)?.toLocaleString()}
          </Typography>
        ) : (
          <Typography>
            {(days === 1 ? collection.social_buying_24h : collection.social_buying_7d)?.toLocaleString()}
          </Typography>
        )}
      </TableCell> */}
    </TableRow>
  )
}

export function HelloMoonLeaderboard({
  title,
  collections: initialCollections,
  filter,
}: {
  title: string
  collections: any[]
  filter: "smartMoneyInflow" | "topSocialBuying"
}) {
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(1)
  const [collections, setCollections] = useState<any[]>(initialCollections)
  const previousDays = usePrevious(days)

  useEffect(() => {
    if (!previousDays || previousDays === days) {
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        setCollections([])
        const collections = await getSmartMoney(filter, days)
        setCollections(collections)
      } catch {
      } finally {
        setLoading(false)
      }
    })()
  }, [days, previousDays])

  return (
    <Stack spacing={2} flexGrow={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" color="primary">
          {title}
        </Typography>
        <ToggleButtonGroup exclusive value={days} onChange={(e, days) => setDays(days)} size="small" color="primary">
          <ToggleButton value={1}>1d</ToggleButton>
          <ToggleButton value={7}>7d</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Card sx={{ flexGrow: 1, height: 400, overflow: "auto", position: "relative" }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography fontWeight="bold" textTransform="uppercase">
                  Rank
                </Typography>
              </TableCell>
              <TableCell>
                <Typography fontWeight="bold" textTransform="uppercase">
                  Collection
                </Typography>
              </TableCell>
              {/* <TableCell>
                <Typography fontWeight="bold" textTransform="uppercase">
                  Vol Δ
                </Typography>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Typography fontWeight="bold" textTransform="uppercase">
                    Index
                  </Typography>
                  <Tooltip title="Hello Moon's internal ranking system">
                    <InfoOutlined color="primary" />
                  </Tooltip>
                </Stack>
              </TableCell> */}
            </TableRow>
          </TableHead>
          {collections.length && !loading ? (
            <TableBody>
              {collections.map((tc, index) => (
                <Collection
                  key={index}
                  index={index}
                  collection={tc}
                  days={days}
                  isSmartMoney={filter === "smartMoneyInflow"}
                />
              ))}
            </TableBody>
          ) : (
            <TableBody>
              <TableRow>
                <TableCell colSpan={4}>
                  <Box
                    sx={{
                      height: 300,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {loading ? <CircularProgress /> : <Typography>Error reading from Hello Moon API</Typography>}
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </Card>
    </Stack>
  )
}
