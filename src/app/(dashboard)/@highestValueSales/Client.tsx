"use client"
import { FixedSizeList as List } from "react-window"
import { Stack, Typography, ToggleButtonGroup, ToggleButton, Box, CircularProgress, Skeleton } from "@mui/material"
import { useEffect, useState } from "react"
import { Sale } from "./Sale"
import { getSalesForPeriod } from "./get-sales-for-period"
import AutoSizer from "react-virtualized-auto-sizer"
import { usePrevious } from "@/hooks/use-previous"

const Column = ({ index, style, data }: { index: number; style: object; data: any }) => (
  <div style={style}>
    <Sale sale={data[index]} />
  </div>
)

export function Client({ sales: initialSales }: { sales: any[] }) {
  const [sales, setSales] = useState(initialSales)
  const [loading, setLoading] = useState(false)
  const [hours, setHours] = useState(168)
  const previousHours = usePrevious(hours)

  useEffect(() => {
    if (!previousHours || previousHours === hours) {
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        const sales = await getSalesForPeriod(hours)
        setSales(sales)
      } finally {
        setLoading(false)
      }
    })()
  }, [hours, previousHours])

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" color="primary">
          Highest value sales
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={hours}
          onChange={(e, hours) => hours && setHours(hours)}
          size="small"
          color="primary"
        >
          <ToggleButton value={1}>1h</ToggleButton>
          <ToggleButton value={6}>6h</ToggleButton>
          <ToggleButton value={24}>1d</ToggleButton>
          <ToggleButton value={168}>7d</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box height={300}>
        {loading ? (
          <Skeleton width="100%" height={300} />
        ) : (
          // <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
          //   <Stack justifyContent="center" alignItems="center" spacing={1}>
          //     <Typography color="primary">Reading sales from Hello Moon</Typography>
          //     <CircularProgress />
          //   </Stack>
          // </Box>
          <AutoSizer>
            {({ width }) => {
              return (
                <List
                  height={300}
                  itemCount={sales.length}
                  itemSize={220}
                  layout="horizontal"
                  width={width}
                  itemData={sales}
                >
                  {Column}
                </List>
              )
            }}
          </AutoSizer>
        )}
      </Box>
    </Stack>
  )
}
