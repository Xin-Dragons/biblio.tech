import { Close, Image as ImageIcon } from "@mui/icons-material"
import { IconButton, Dialog, Card, CardContent, Stack, Typography, Alert, LinearProgress, Button } from "@mui/material"
import Jimp from "jimp/es"
import { FC, useState } from "react"
import { toast } from "react-hot-toast"
import { useNfts } from "../../context/nfts"
import { useAccess } from "../../context/access"
import axios from "axios"

export const Collage: FC = () => {
  const { nfts, filtered } = useNfts()
  const { isActive } = useAccess()
  const [image, setImage] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(0)
  const [collageModalShowing, setCollageModalShowing] = useState(false)

  function toggleCollageModalShowing() {
    setCollageModalShowing(!collageModalShowing)
  }

  async function generateCollage() {
    setGenerating(true)
    setGenerated(0)
    const mints = filtered.map((n) => n.nftMint)
    const images = (
      await Promise.all(
        mints
          .map((mint) => {
            const nft = nfts.find((n) => n.nftMint === mint)
            return nft?.thumbnail || nft?.json?.image
          })
          .filter(Boolean)
          .map((item) => item.replace("ipfs://", "https://ipfs.io/ipfs/"))
          .map(async (image) => {
            try {
              const jimp = await Jimp.read(image)
              setGenerated((prev) => prev + 1)
              return jimp
            } catch {
              try {
                const { data } = await axios.get("/api/get-image", {
                  params: {
                    image: `https://img-cdn.magiceden.dev/rs:fill:300:300:0:0/plain/${image}`,
                  },
                  responseType: "arraybuffer",
                })

                const jimp = await Jimp.read(data)

                setGenerated((prev) => prev + 1)

                return jimp
              } catch {
                setGenerated((prev) => prev + 1)
                return null
              }
            }
          })
      )
    ).filter(Boolean)

    const ratio = 16 / 9

    const rows = Math.ceil((Math.sqrt(images.length) * 3) / 4)
    const cols = Math.ceil(images.length / rows)
    const output: Jimp[][] = []
    const logo = await Jimp.read("/biblio-logo-small.png")
    Array.from(new Array(rows).keys()).forEach(() => {
      const row = images.splice(0, cols) as Jimp[]
      if (row.length < cols) {
        Array.from(new Array(cols - row.length).keys()).forEach(() => {
          row.push(logo)
        })
      }
      output.push(row)
    })

    const collagePromise = createCollage(output)

    toast.promise(collagePromise, {
      loading: "Creating collage",
      success: "Created successfully",
      error: "Something went wrong",
    })
  }

  async function getEmptyJimp(width: number, height: number): Promise<Jimp> {
    return new Promise((resolve, reject) => {
      new Jimp(width, height, 0x1f1f1f, (err, image) => {
        if (err) {
          return reject(err)
        }
        resolve(image)
      })
    })
  }

  async function createCollage(rows: Jimp[][]) {
    try {
      const edge = Math.floor(1600 / rows[0].length)
      const jimps = await Promise.all(
        rows.map(async (row) => {
          const rowJimps = await Promise.all(
            row.map(async (jimp) => {
              return jimp.resize(edge, edge)
            })
          )
          return rowJimps
        })
      )
      const canvas = await getEmptyJimp(edge * rows[0].length, edge * rows.length)
      let image = jimps.reduce((img: any, row, rowIndex) => {
        const compositeRow = row.reduce((item, image, index) => {
          return item.composite(image, index * edge, rowIndex * edge)
        }, img)
        return compositeRow
      }, canvas)

      if (!isActive) {
        const logo = await Jimp.read("/biblio-logo.png")

        logo.resize(image.bitmap.width / 10, Jimp.AUTO)

        const x = image.bitmap.width / 2 - logo.bitmap.width / 2
        const y = image.bitmap.height / 2 - logo.bitmap.height / 2

        image = image.composite(logo, x, y, {
          mode: Jimp.BLEND_SCREEN,
          opacitySource: 0.3,
          opacityDest: 1,
        })
      }

      const base64Image = await image.getBase64Async(Jimp.MIME_PNG)
      setImage(base64Image)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Error generating")
    } finally {
      setGenerating(false)
    }
  }

  function closeImage() {
    setImage(null)
    setCollageModalShowing(false)
  }

  return (
    <>
      <IconButton onClick={toggleCollageModalShowing} disabled={!filtered.length}>
        <ImageIcon />
      </IconButton>
      <Dialog open={collageModalShowing} onClose={toggleCollageModalShowing}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Export collage</Typography>
              <Typography>Export a collage of {filtered.length} items</Typography>
              {filtered.length > 100 && (
                <Alert severity="info">Exporting a large number of images, this may take a while!</Alert>
              )}
              {generating && (
                <>
                  <Typography>
                    {generated < filtered.length ? generated : filtered.length} / {filtered.length}
                  </Typography>
                  <LinearProgress variant="determinate" value={(generated / filtered.length) * 100} />
                </>
              )}

              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button color="error" onClick={toggleCollageModalShowing} disabled={generating}>
                  Cancel
                </Button>
                <Button onClick={generateCollage} disabled={generating}>
                  Generate collage
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
      <Dialog open={!!image} onClose={closeImage} fullScreen>
        <IconButton
          size="large"
          sx={{
            position: "fixed",
            top: "0.25em",
            right: "0.25em",
            background: "#1f1f1f",
            "&:hover": {
              background: "#333",
            },
          }}
          onClick={closeImage}
        >
          <Close fontSize="large" />
        </IconButton>
        <img src={image || ""} />
      </Dialog>
    </>
  )
}
