import type { ClusterUrl, RpcTransportFromClusterUrl } from "@solana/kit"

type QueuedRequest<TClusterUrl extends ClusterUrl> = Readonly<{
  config: Parameters<RpcTransportFromClusterUrl<TClusterUrl>>[0]
  reject: (reason?: unknown) => void
  requestNumber: number
  resolve: (value: unknown) => void
}>

export function getThrottledTransport<TClusterUrl extends ClusterUrl>(
  originalTransport: RpcTransportFromClusterUrl<TClusterUrl>,
  maxRps: number
): RpcTransportFromClusterUrl<TClusterUrl> {
  let requestBudgetRemaining = maxRps
  let pendingQueueRunTimerId: ReturnType<typeof setTimeout> | undefined
  const queuedRequests: QueuedRequest<TClusterUrl>[] = []

  function processQueue() {
    if (requestBudgetRemaining === 0) {
      return
    }
    while (queuedRequests.length && requestBudgetRemaining > 0) {
      const request = queuedRequests.shift()!
      if (request.config.signal?.aborted) {
        continue
      }
      originalTransport(request.config).then(request.resolve).catch(request.reject)
      requestBudgetRemaining--
      if (pendingQueueRunTimerId === undefined) {
        pendingQueueRunTimerId = setTimeout(() => {
          pendingQueueRunTimerId = undefined
          requestBudgetRemaining = maxRps
          processQueue()
        }, 1_000)
      }
    }
  }

  let requestCount = 0
  return function throttlingTransport(config) {
    return new Promise((resolve, reject) => {
      queuedRequests.push({
        config,
        reject,
        requestNumber: ++requestCount,
        resolve,
      } as QueuedRequest<TClusterUrl>)
      if (config.signal) {
        config.signal.addEventListener("abort", () => {
          reject(config.signal?.reason)
        })
      }
      processQueue()
    })
  } as RpcTransportFromClusterUrl<TClusterUrl>
}
