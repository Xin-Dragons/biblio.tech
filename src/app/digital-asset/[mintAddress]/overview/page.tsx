import { Stack, Typography, Box, TableCell, Table, TableRow, TableBody, Grid, Tooltip } from "@mui/material"
import { CopyAddress } from "@/components/CopyAddress"
import { ImageWithFallback } from "@/components/ImageWithFallback"
import { loadDigitalAsset } from "@/helpers/digital-assets"
import { CheckCross } from "@/components/CheckCross"
import { TensorProvider } from "@/context/tensor"
import { Listing } from "@/components/Listing"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import dayjs from "@/helpers/dayjs"
import { format } from "date-fns"

export default async function Page({ params }: { params: Record<string, string> }) {
  const digitalAsset = await loadDigitalAsset(params.mintAddress)
  console.log(digitalAsset)

  return (
    <Box my={4}>
      <Grid container spacing={4}>
        <Grid item xs={6}>
          <Stack spacing={4}>
            <ImageWithFallback src={digitalAsset.image as string} size={500} />
            {digitalAsset.listing && (
              <TensorProvider>
                <Listing
                  digitalAsset={JSON.parse(JSON.stringify(digitalAsset))}
                  royaltiesEnforced={digitalAsset.tokenStandard === 4}
                  sellerFeeBasisPoints={digitalAsset.sellerFeeBasisPoints as number}
                />
              </TensorProvider>
            )}
          </Stack>
        </Grid>
        <Grid item xs={6}>
          <Stack spacing={4}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight="bold" color="primary">
                Details
              </Typography>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Typography>Mint Address:</Typography>
                    </TableCell>
                    <TableCell>
                      <CopyAddress linkPath="digital-asset">{digitalAsset.id}</CopyAddress>
                    </TableCell>
                  </TableRow>
                  {digitalAsset.verifiedCollection && (
                    <TableRow>
                      <TableCell>
                        <Typography>Metaplex Certified Collection:</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} width="100%" justifyContent="flex-end">
                          <CheckCross value={true} />
                          <CopyAddress linkPath="collection">{digitalAsset.verifiedCollection}</CopyAddress>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell>
                      <Typography>Update Authority:</Typography>
                    </TableCell>
                    <TableCell>
                      {digitalAsset.updateAuthority ? (
                        <CopyAddress linkPath="wallet">{digitalAsset.updateAuthority}</CopyAddress>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                  {digitalAsset.isNonFungible && (
                    <TableRow>
                      <TableCell>
                        <Typography>Holder:</Typography>
                      </TableCell>
                      <TableCell>
                        <CopyAddress linkPath="wallet">{digitalAsset.owner}</CopyAddress>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Stack>

            {digitalAsset.lastSale && (
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  Last sale
                </Typography>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Tooltip title={format(new Date(digitalAsset.lastSale.txAt), "yyyy/MM/dd hh:mm:ss")}>
                          <Typography>{dayjs(digitalAsset.lastSale.txAt).fromNow()}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" color="primary">
                          ◎
                          {(digitalAsset.lastSale.price / LAMPORTS_PER_SOL).toLocaleString(undefined, {
                            maximumSignificantDigits: 3,
                          })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Stack>
            )}

            <Stack spacing={2}>
              <Typography variant="h5" fontWeight="bold" color="primary">
                Traits
              </Typography>
              <Box width="100%">
                <Grid container spacing={2}>
                  {(digitalAsset.attributes || []).map((att, index: number, atts) => {
                    const isMax = (att.floor || 0) >= Math.max(...atts.map((item) => item.floor || 0))
                    return (
                      <Grid item xs={4} key={index}>
                        <Box
                          sx={{
                            borderRadius: "5px",
                            border: "1px solid",
                            padding: 1,
                            borderColor: "primary.main",
                            overflow: "hidden",
                          }}
                        >
                          <Typography
                            color="primary"
                            textTransform="uppercase"
                            variant="h6"
                            whiteSpace="nowrap"
                            textOverflow="ellipsis"
                          >
                            {att?.trait_type}
                          </Typography>
                          <Typography textOverflow="ellipsis" whiteSpace="nowrap" overflow="hidden">
                            {att?.value}
                          </Typography>
                          <Typography
                            fontWeight={isMax ? "bold" : "normal"}
                            sx={{ color: isMax ? "success.main" : "text.secondary" }}
                          >
                            {att.floor && `◎${(att.floor / LAMPORTS_PER_SOL).toLocaleString()}`}
                          </Typography>
                        </Box>
                      </Grid>
                    )
                  })}
                </Grid>
              </Box>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
