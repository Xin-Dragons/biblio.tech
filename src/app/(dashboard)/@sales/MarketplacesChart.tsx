"use client"
import { Stack, Typography, Card, CardContent, useTheme } from "@mui/material"
import { groupBy, map, orderBy } from "lodash"
import { ResponsiveContainer, Pie, Cell, PieChart } from "recharts"

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  index,
  marketplace,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  index: number
  marketplace: string
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {`${marketplace} ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function MarketplacesChart({ sales }: { sales: any }) {
  const marketplaces = map(
    groupBy(sales, (sale) => sale.marketplace),
    (value, marketplace) => ({
      marketplace,
      value: value.reduce((sum, item) => sum + item.price, 0),
    })
  )

  const theme = useTheme()

  const COLORS = [
    theme.palette.primary.dark,
    theme.palette.secondary.dark,
    theme.palette.info.dark,
    theme.palette.warning.dark,
    theme.palette.error.dark,
  ]

  return (
    <Stack spacing={2} flexGrow={1}>
      <Typography variant="h5" color="primary">
        Marketplaces
      </Typography>
      <Card>
        <CardContent sx={{ height: 500, overflow: "auto" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={600} height={600}>
              <Pie
                data={marketplaces}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={180}
                fill="#000000"
                dataKey="value"
              >
                {marketplaces.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Stack>
  )
}
