import { Modal, Container, Card, CardContent, Box, Grid, Typography, CircularProgress } from "@mui/material"
import { DigitalAssetWithJson, useNfts } from "./context/nft"

import { NftImage } from "./NftImage"
import { isSome } from "@metaplex-foundation/umi"

export function NftSelector({
  nfts,
  onSelect,
  open,
  onClose,
  selected,
}: {
  nfts: DigitalAssetWithJson[]
  onSelect: Function
  open: boolean
  onClose: Function
  selected?: string
}) {
  const { loading } = useNfts()
  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Container sx={{ margin: 10, maxHeight: "80%", overflowY: "auto", outline: "none" }}>
        <Card>
          <CardContent>
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : nfts.length ? (
              <Grid container spacing={2}>
                {nfts.map((nft, index) => {
                  const isCollection = isSome(nft.metadata.collectionDetails)
                  return (
                    <Grid key={index} item xs={2}>
                      <Card
                        sx={{
                          outline: nft.publicKey === selected ? "3px solid white" : "none",
                        }}
                        onClick={() => onSelect(nft.publicKey)}
                      >
                        <NftImage key={index} nft={nft} />
                        <CardContent>
                          <Typography variant="h6">{nft.metadata.name || nft.json.name}</Typography>
                          <Typography
                            textTransform="uppercase"
                            variant="body2"
                            color={isCollection ? "orange" : "primary"}
                            sx={{
                              border: "1px solid",
                              padding: "2px 4px",
                              borderRadius: "5px",
                              display: "inline-block",
                              fontSize: "10px",
                            }}
                          >
                            {isCollection ? "Collection" : "NFT"}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center">
                <Typography variant="h4" textAlign="center">
                  No eligible NFTs detected
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Modal>
  )
}
