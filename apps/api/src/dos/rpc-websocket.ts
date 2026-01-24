import { DurableObject } from "cloudflare:workers"
import type { Env } from "../types"

/**
 * RPC WebSocket Durable Object
 * Proxies WebSocket connections to Helius RPC endpoint
 * This allows wallet adapters to use WebSocket subscriptions while keeping the API key protected
 */
export class RpcWebSocketDO extends DurableObject<Env> {
  private upstreamWs: WebSocket | null = null
  private clientWs: WebSocket | null = null
  private messageBuffer: (string | ArrayBuffer)[] = []
  private upstreamReady = false

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade")
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server)
    this.clientWs = server
    this.messageBuffer = []
    this.upstreamReady = false

    // Connect to upstream Helius WebSocket
    const heliusWsUrl = `wss://mainnet.helius-rpc.com/?api-key=${this.env.HELIUS_API_KEY}`
    const upstream = new WebSocket(heliusWsUrl)

    upstream.addEventListener("open", () => {
      this.upstreamWs = upstream
      this.upstreamReady = true

      // Flush buffered messages
      if (this.messageBuffer.length > 0) {
        for (const msg of this.messageBuffer) {
          upstream.send(msg)
        }
        this.messageBuffer = []
      }
    })

    upstream.addEventListener("message", (event) => {
      if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
        this.clientWs.send(event.data as string)
      }
    })

    upstream.addEventListener("close", (event) => {
      if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
        this.clientWs.close(event.code, event.reason)
      }
      this.upstreamWs = null
    })

    upstream.addEventListener("error", () => {
      console.error("[WS-DO] Upstream WebSocket error")
      if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
        this.clientWs.close(1011, "Upstream error")
      }
      this.upstreamWs = null
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Forward client messages to upstream, or buffer if not ready
    if (this.upstreamReady && this.upstreamWs && this.upstreamWs.readyState === WebSocket.OPEN) {
      this.upstreamWs.send(message)
    } else {
      this.messageBuffer.push(message)
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    // Close upstream when client disconnects
    if (this.upstreamWs && this.upstreamWs.readyState === WebSocket.OPEN) {
      this.upstreamWs.close(code, reason)
    }
    this.upstreamWs = null
    this.clientWs = null
    this.messageBuffer = []
    this.upstreamReady = false
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("[WS-DO] Client WebSocket error:", error)
    if (this.upstreamWs && this.upstreamWs.readyState === WebSocket.OPEN) {
      this.upstreamWs.close(1011, "Client error")
    }
    this.upstreamWs = null
    this.clientWs = null
  }
}
