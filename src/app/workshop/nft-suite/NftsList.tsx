import { DigitalAsset } from "@metaplex-foundation/mpl-token-metadata"
import { Done } from "@mui/icons-material"
import { Typography, Stack, Chip } from "@mui/material"
import { useState, useRef, useEffect } from "react"

const NftToUpdate = ({ nft, done }: { nft: DigitalAsset; done: boolean }) => {
  return <Chip label={nft.metadata.name} color={done ? "success" : "default"} icon={done ? <Done /> : undefined} />
}

export const NftsList = ({ nfts, done }: { nfts: DigitalAsset[]; done: string[] }) => {
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<DigitalAsset[]>([])
  const loader = useRef()

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setPage((prev) => prev + 1))
    setPage(1)
    if (loader.current) observer.observe(loader.current)

    return () => {
      observer.disconnect()
    }
  }, [nfts])

  useEffect(() => {
    setItems(nfts.slice(0, (page + 1) * 40))
  }, [nfts, page])

  if (!nfts.length) {
    return <Typography>No NFTs will be updated</Typography>
  }

  const toUpdate = nfts.filter((item) => !done.includes(item.publicKey))

  return (
    <Stack spacing={2}>
      <Typography>
        {toUpdate.length} NFT{toUpdate.length === 1 ? "" : "s"} to be updated
      </Typography>
      <Stack
        direction="row"
        spacing={0}
        sx={{ maxHeight: "500px", overflowY: "auto", maxWidth: "100%", flexWrap: "wrap", gap: 1 }}
      >
        {items.map((nft, index: number) => (
          <NftToUpdate nft={nft} key={index} done={done.includes(nft.publicKey)} />
        ))}
        <div ref={loader.current} />
      </Stack>
    </Stack>
  )
}
