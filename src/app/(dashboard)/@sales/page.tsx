import { fetchAllDigitalAssetsByIds } from "@/helpers/digital-assets"
import { getAllSalesInPeriod } from "@/helpers/hello-moon-server-actions"
import { groupBy, map, orderBy } from "lodash"
import { MarketplacesChart } from "./MarketplacesChart"
import { CopyAddress } from "@/components/CopyAddress"
import { Stack, Typography, Card, CardContent, Table, TableBody, TableRow, TableCell } from "@mui/material"

export const revalidate = 60

export async function getSalesForPeriod(hours: number) {
  const sales = orderBy(
    await getAllSalesInPeriod(hours),
    (item) => {
      return item.price
    },
    "desc"
  )

  const mints = sales.map((s) => s.nftMint)
  const das = (await fetchAllDigitalAssetsByIds(mints)).filter(Boolean)

  return sales
    .map((s) => {
      const da = das.find((da: any) => da.id === s.nftMint)
      return {
        ...s,
        digitalAsset: da,
      }
    })
    .filter((s) => s.digitalAsset && s.digitalAsset.content.links.image)
}

export default async function Sales() {
  const sales = await getSalesForPeriod(1)

  const buyers = orderBy(
    map(
      groupBy(sales, (sale) => sale.buyer),
      (value, address) => ({
        address,
        value: value.reduce((sum, item) => sum + item.price, 0),
      })
    ),
    (item) => item.value,
    "desc"
  )

  const sellers = orderBy(
    map(
      groupBy(sales, (sale) => sale.seller),
      (value, address) => ({
        address,
        value: value.reduce((sum, item) => sum + item.price, 0),
      })
    ),
    (item) => item.value,
    "desc"
  )

  return (
    <Stack spacing={4}>
      <Stack spacing={2}></Stack>
      <Typography variant="h4">Active traders</Typography>
      <Stack direction="row" justifyContent="space-between" spacing={4}>
        <Stack spacing={2}>
          <Typography variant="h5" color="primary">
            Top buyers
          </Typography>
          <Card>
            <CardContent sx={{ height: 500, overflow: "auto" }}>
              <Table>
                <TableBody>
                  {buyers.map((buyer, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <CopyAddress align="left" linkPath="wallet">
                          {buyer.address}
                        </CopyAddress>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6">◎{buyer.value.toLocaleString()}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
        <Stack spacing={2}>
          <Typography variant="h5" color="primary">
            Top sellers
          </Typography>
          <Card>
            <CardContent sx={{ height: 500, overflow: "auto" }}>
              <Table>
                <TableBody>
                  {sellers.map((seller, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <CopyAddress align="left" linkPath="wallet">
                          {seller.address}
                        </CopyAddress>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6">◎{seller.value.toLocaleString()}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
        <MarketplacesChart sales={sales} />
      </Stack>
    </Stack>
  )
}
