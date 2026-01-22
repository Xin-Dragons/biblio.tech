import { Hono } from "hono"
import type { HonoEnv } from "../types"

export const imageProxyRoutes = new Hono<HonoEnv>()

const ALLOWED_DOMAINS = [
  "prod-image-cdn.tensor.trade",
  "arweave.net",
  "www.arweave.net",
  "nftstorage.link",
  "ipfs.io",
  "cloudflare-ipfs.com",
]

imageProxyRoutes.get("/", async (c) => {
  const url = c.req.query("url")

  if (!url) {
    return c.json({ error: "Missing url parameter" }, 400)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return c.json({ error: "Invalid URL" }, 400)
  }

  if (!ALLOWED_DOMAINS.some((domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`))) {
    return c.json({ error: "Domain not allowed" }, 403)
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Biblio/1.0",
      },
    })

    if (!response.ok) {
      return c.json({ error: `Failed to fetch image: ${response.status}` }, response.status as 400)
    }

    const contentType = response.headers.get("content-type")
    if (!contentType?.startsWith("image/")) {
      return c.json({ error: "Not an image" }, 400)
    }

    const imageBuffer = await response.arrayBuffer()

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (err) {
    console.error("Image proxy error:", err)
    return c.json({ error: "Failed to fetch image" }, 500)
  }
})
