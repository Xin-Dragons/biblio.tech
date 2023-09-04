import { Sidebar } from "@/components/Sidebar"
import { ethAlchemy } from "@/helpers/alchemy"
import { Box, Stack, SvgIcon, Typography } from "@mui/material"
import Eth from "@/../public/eth.svg"
import { getCollectionStatsFromContract } from "@/helpers/opensea"
import { ArrowDownward, ArrowUpward } from "@mui/icons-material"
import { bigNumberFormatter } from "@/helpers/utils"

// async function getNftsForContract(address: string) {
//   try {
//     let nfts = []
//     // Get the async iterable for the contract's NFTs.
//     const nftsIterable = ethAlchemy.nft.getNftsForContractIterator(address)

//     // Iterate over the NFTs and add them to the nfts array.
//     for await (const nft of nftsIterable) {
//       nfts.push(nft)
//     }

//     // Log the NFTs.
//     return nfts
//   } catch (error) {
//     console.log(error)
//   }
// }

export default async function Layout({ params }: { params: Record<string, string> }) {
  const collection = await ethAlchemy.nft.getContractMetadata(params.collectionId)

  const nfts = await ethAlchemy.nft.getNftsForContract(params.collectionId, {
    pageSize: 10_000,
  })

  const fp = collection.openSea?.floorPrice

  const stats = await getCollectionStatsFromContract(params.collectionId)
  console.log(stats)

  return (
    <Stack direction="row" height="100%" width="100%">
      <Sidebar>
        <Box padding={2}>{/* <AttributeFilters /> */}</Box>
      </Sidebar>
      <Stack height="100%" spacing={2} padding={2} flexGrow={1} width="100%">
        <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h4">{collection.openSea?.collectionName || collection.name}</Typography>
            <Stack direction="row" spacing={2}>
              {fp && (
                <Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <SvgIcon>
                      <Eth />
                    </SvgIcon>
                    <Typography color="primary" variant="h5">
                      {fp < 1
                        ? fp.toLocaleString(undefined, {
                            minimumFractionDigits: 3,
                          })
                        : fp.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                    </Typography>
                  </Stack>
                  <Typography variant="body2">FLOOR PRICE</Typography>
                </Stack>
              )}
              <Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SvgIcon>
                    <Eth />
                  </SvgIcon>
                  <Typography color="primary" variant="h5">
                    {bigNumberFormatter.format(stats.one_day_volume)}
                  </Typography>
                </Stack>
                <Typography variant="body2">24H VOLUME</Typography>
              </Stack>
              <Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {stats.one_day_change > 0 ? <ArrowUpward color="success" /> : <ArrowDownward color="error" />}
                  <Typography color="primary" variant="h5">
                    {(stats.one_day_change * 100).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                    %
                  </Typography>
                </Stack>
                <Typography variant="body2">VOLUME CHANGE</Typography>
              </Stack>
              <Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SvgIcon>
                    <Eth />
                  </SvgIcon>
                  <Typography color="primary" variant="h5">
                    {bigNumberFormatter.format(stats.total_volume)}
                  </Typography>
                </Stack>
                <Typography variant="body2">TOTAL VOLUME</Typography>
              </Stack>
              <Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography color="primary" variant="h5">
                    {bigNumberFormatter.format(stats.total_supply)}
                  </Typography>
                </Stack>
                <Typography variant="body2">SUPPLY</Typography>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography color="primary" variant="h5">
                      {bigNumberFormatter.format(stats.num_owners)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2">HOLDERS</Typography>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  )
}
