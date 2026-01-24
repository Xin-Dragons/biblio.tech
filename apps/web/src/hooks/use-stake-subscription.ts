import { useEffect, useRef } from "react"
import { useSetAtom } from "jotai"
import { useWallet } from "@solana/connector/react"
import { fetchUserStakeRecordsAtom, invalidateStakeRecordsCache } from "@/stores/stake"

const WS_PROXY_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/rpc/ws`
const STAKE_PROGRAM = "STAKEQkGBjkhCXabzB5cUbWgSSvbVJFEm2oEnyWzdKE"

/**
 * Subscribes to stake program logs via WebSocket to detect real-time changes.
 * When stake/unstake transactions are detected, automatically refetches stake records.
 */
export function useStakeSubscription() {
  const { account } = useWallet()
  const fetchUserStakeRecords = useSetAtom(fetchUserStakeRecordsAtom)
  const wsRef = useRef<WebSocket | null>(null)
  const subscriptionIdRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!account) {
      return
    }

    const wallet = account

    let isCleaningUp = false

    function connect() {
      if (isCleaningUp) return

      console.log("[StakeSub] Connecting to WebSocket...")
      const ws = new WebSocket(WS_PROXY_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[StakeSub] WebSocket connected, subscribing to logs...")
        const subscribeMsg = {
          jsonrpc: "2.0",
          id: 1,
          method: "logsSubscribe",
          params: [{ mentions: [STAKE_PROGRAM] }, { commitment: "confirmed" }],
        }
        ws.send(JSON.stringify(subscribeMsg))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            id?: number
            result?: number
            method?: string
            params?: {
              result?: {
                value?: {
                  signature?: string
                  logs?: string[]
                }
              }
            }
          }

          // Subscription confirmation
          if (data.id === 1 && data.result !== undefined) {
            subscriptionIdRef.current = data.result
            console.log("[StakeSub] Subscribed with id:", data.result)
            return
          }

          // Log notification
          if (data.method === "logsNotification" && data.params?.result?.value) {
            const { signature, logs } = data.params.result.value
            if (!logs) return

            // Check if this transaction involves our wallet
            const logsStr = logs.join(" ")
            if (logsStr.includes(wallet)) {
              console.log("[StakeSub] Detected stake program activity for wallet:", signature)
              // Invalidate cache and refetch
              invalidateStakeRecordsCache(wallet)
              fetchUserStakeRecords({ wallet, silent: true })
            }
          }
        } catch (err) {
          console.error("[StakeSub] Error parsing message:", err)
        }
      }

      ws.onclose = (event) => {
        console.log("[StakeSub] WebSocket closed:", event.code, event.reason)
        wsRef.current = null
        subscriptionIdRef.current = null

        // Reconnect after delay unless cleaning up
        if (!isCleaningUp) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000)
        }
      }

      ws.onerror = (error) => {
        console.error("[StakeSub] WebSocket error:", error)
      }
    }

    connect()

    return () => {
      isCleaningUp = true

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      if (wsRef.current) {
        // Unsubscribe before closing
        if (subscriptionIdRef.current !== null && wsRef.current.readyState === WebSocket.OPEN) {
          const unsubscribeMsg = {
            jsonrpc: "2.0",
            id: 2,
            method: "logsUnsubscribe",
            params: [subscriptionIdRef.current],
          }
          wsRef.current.send(JSON.stringify(unsubscribeMsg))
        }
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [account, fetchUserStakeRecords])
}
