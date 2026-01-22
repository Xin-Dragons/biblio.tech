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
    console.log("[WS-DO] Received WebSocket upgrade request")
    const upgradeHeader = request.headers.get("Upgrade")
    if (upgradeHeader !== "websocket") {
      console.log("[WS-DO] Not a WebSocket upgrade request")
      return new Response("Expected WebSocket", { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server)
    this.clientWs = server
    this.messageBuffer = []
    this.upstreamReady = false
    console.log("[WS-DO] Accepted client WebSocket")

    // Connect to upstream Helius WebSocket
    const heliusWsUrl = `wss://mainnet.helius-rpc.com/?api-key=${this.env.HELIUS_API_KEY}`
    console.log("[WS-DO] Connecting to upstream Helius WebSocket...")
    const upstream = new WebSocket(heliusWsUrl)

    upstream.addEventListener("open", () => {
      console.log("[WS-DO] Upstream WebSocket connected")
      this.upstreamWs = upstream
      this.upstreamReady = true

      // Flush buffered messages
      if (this.messageBuffer.length > 0) {
        console.log(`[WS-DO] Flushing ${this.messageBuffer.length} buffered messages`)
        for (const msg of this.messageBuffer) {
          upstream.send(msg)
          console.log("[WS-DO] Flushed buffered message:", typeof msg === "string" ? msg : "[binary]")
        }
        this.messageBuffer = []
      }
    })

    upstream.addEventListener("message", (event) => {
      console.log("[WS-DO] Received from upstream:", event.data)
      if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
        this.clientWs.send(event.data as string)
        console.log("[WS-DO] Forwarded to client")
      } else {
        console.log("[WS-DO] Client not ready, message dropped")
      }
    })

    upstream.addEventListener("close", (event) => {
      console.log(`[WS-DO] Upstream closed: ${event.code} ${event.reason}`)
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
    const msgStr = typeof message === "string" ? message : new TextDecoder().decode(message)
    console.log("[WS-DO] Received from client:", msgStr)

    // Forward client messages to upstream, or buffer if not ready
    if (this.upstreamReady && this.upstreamWs && this.upstreamWs.readyState === WebSocket.OPEN) {
      this.upstreamWs.send(message)
      console.log("[WS-DO] Forwarded to upstream")
    } else {
      console.log("[WS-DO] Upstream not ready, buffering message")
      this.messageBuffer.push(message)
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    console.log(`[WS-DO] Client closed: ${code} ${reason}`)
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
