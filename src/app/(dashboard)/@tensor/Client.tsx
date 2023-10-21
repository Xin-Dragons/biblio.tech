"use client"
import { isUUID, lamportsToSol } from "@/helpers/utils"
import { ArrowUpward, ArrowDownward } from "@mui/icons-material"
import {
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Link,
  TableContainer,
  Button,
  Chip,
  CircularProgress,
  Box,
} from "@mui/material"
import { useEffect, useState } from "react"
import { usePrevious } from "@/hooks/use-previous"
import { uniqBy } from "lodash"
import NextLink from "next/link"
import { getTensorCollections } from "@/helpers/tensor-server-actions"

export function Client({ collections: initialCollections }: { collections: any[] }) {
  const [collections, setCollections] = useState(initialCollections)
  const [sortBy, setSortBy] = useState("volume24h")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [helloMoonCollectionIds, setHelloMoonCollectionIds] = useState<any[]>([])

  const previousPage = usePrevious(page)
  const previousSortBy = usePrevious(sortBy)

  useEffect(() => {
    if (!previousSortBy || sortBy === previousSortBy) {
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        setCollections([])
        const collections = await getTensorCollections(sortBy, "desc")
        if (collections) {
          setCollections(collections)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [sortBy])

  useEffect(() => {
    if (!previousPage || page === previousPage) {
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        const newCollections = await getTensorCollections(sortBy, "desc", page)
        if (newCollections) {
          setCollections((prev) => {
            return uniqBy([...prev, ...newCollections], (item: any) => item.id)
          })
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [page, previousPage])

  const onHeaderClick = (col: string) => (e: any) => {
    e.preventDefault()
    setSortBy(col)
    setPage(1)
  }

  const columns = [
    {
      id: "rank",
      label: "Rank",
    },
    {
      id: "id",
      label: "Collection",
      maxWidth: 150,
    },
    {
      id: "buyNowPrice",
      label: "Floor",
    },
    {
      id: "floor24h",
      label: "Floor Δ",
    },
    {
      id: "volume24h",
      label: "Vol (24h)",
      sort: true,
    },
    {
      id: "sales24h",
      label: "Sales (24h)",
      sort: true,
    },
    {
      id: "volumeAll",
      label: "Total volume",
      sort: true,
    },
    {
      id: "listed",
      label: "Listed / Supply",
    },
  ]

  function loadMore() {
    setPage(page + 1)
  }

  console.log({ helloMoonCollectionIds })

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Top collections</Typography>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column, key) => (
              <TableCell width={column.maxWidth || "unset"} sx={{ top: "-32px" }} key={key}>
                {column.sort ? (
                  <Stack direction="row" alignItems="center" justifyContent={"space-between"}>
                    <Link
                      href="#"
                      onClick={onHeaderClick(column.id)}
                      underline={sortBy === column.id ? "none" : "hover"}
                      sx={{ cursor: sortBy === column.id ? "default" : "pointer" }}
                    >
                      <Typography fontWeight="bold" textTransform="uppercase">
                        {column.label}
                      </Typography>
                    </Link>
                    <Typography color="primary">{sortBy === column.id && "▼"}</Typography>
                  </Stack>
                ) : (
                  <Typography fontWeight="bold" textTransform="uppercase">
                    {column.label}
                  </Typography>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {collections.map((collection: any, index: number) => {
            const percentListed = (collection.statsV2.numListed / collection.statsV2.numMints) * 100
            return (
              <TableRow key={index}>
                <TableCell>
                  <Chip label={index + 1} />
                </TableCell>
                <TableCell>
                  <Link component={NextLink} href={`/collection/${collection.slugDisplay}`} underline="hover">
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <img src={collection.imageUri} width={75} />
                      <Typography variant="h6">{collection.name}</Typography>
                    </Stack>
                  </Link>
                </TableCell>

                <TableCell>
                  <Typography variant="h6">◎{lamportsToSol(collection.statsV2.buyNowPriceNetFees)}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography
                      fontWeight="bold"
                      variant="h6"
                      sx={{ color: collection.statsV2.floor24h > 0 ? "success.main" : "error.main" }}
                    >
                      {(collection.statsV2.floor24h * 100).toLocaleString()}%
                    </Typography>
                    {collection.statsV2.floor24h > 0 ? (
                      <ArrowUpward color="success" />
                    ) : (
                      <ArrowDownward color="error" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">◎{lamportsToSol(collection.statsV2.volume24h)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">{collection.statsV2.sales24h}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">{lamportsToSol(collection.statsV2.volumeAll)}</Typography>
                </TableCell>
                <TableCell>
                  <Stack>
                    <Typography>
                      <Typography component="span" fontWeight="bold">
                        {collection.statsV2.numListed}
                      </Typography>{" "}
                      / {collection.statsV2.numMints}
                    </Typography>
                    <Typography
                      sx={{
                        color: percentListed < 5 ? "success.main" : percentListed < 10 ? "warning.main" : "error.main",
                      }}
                    >
                      {percentListed.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {!collections.length && loading && (
        <Box display="flex" justifyContent="center" alignItems="center" height={300} width="100%">
          <CircularProgress />
        </Box>
      )}

      <Button size="large" onClick={() => loadMore()} disabled={loading}>
        Load more
      </Button>
    </Stack>
  )
}
