import { Hono } from "hono"
import type { HonoEnv } from "../types"

export const rpcRoutes = new Hono<HonoEnv>()

/**
 * GET /rpc/ws
 * WebSocket endpoint for RPC subscriptions
 * Upgrades to WebSocket and proxies to Helius via Durable Object
 */
rpcRoutes.get("/ws", async (c) => {
  const upgradeHeader = c.req.header("Upgrade")
  if (upgradeHeader !== "websocket") {
    return c.text("Expected WebSocket upgrade", 426)
  }

  // Use a single DO instance for all connections (could be per-user if needed)
  const id = c.env.RPC_WEBSOCKET_DO.idFromName("global")
  const stub = c.env.RPC_WEBSOCKET_DO.get(id)

  return stub.fetch(c.req.raw)
})

/**
 * POST /rpc
 * Proxies JSON-RPC requests to Helius RPC
 * This keeps the API key protected on the server side
 */
rpcRoutes.post("/", async (c) => {
  const body = await c.req.json()

  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${c.env.HELIUS_API_KEY}`

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return c.json(data)
})

/**
 * POST /rpc/send
 * Sends transaction via Helius RPC with priority fees
 * Expects { transaction: string } where transaction is base64 encoded
 */
rpcRoutes.post("/send", async (c) => {
  const { transaction } = await c.req.json<{ transaction: string }>()

  const requestBody = {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "sendTransaction",
    params: [
      transaction,
      {
        encoding: "base64",
        skipPreflight: true,
        maxRetries: 0,
      },
    ],
  }

  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${c.env.HELIUS_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json()
  return c.json(data)
})
