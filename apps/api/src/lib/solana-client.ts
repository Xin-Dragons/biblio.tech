import {
  createDefaultRpcTransport,
  createRpc,
  createJsonRpcApi,
  type SolanaRpcApiMainnet,
  type RpcTransport,
  DEFAULT_RPC_CONFIG,
  type SolanaRpcApi,
  type RpcApi,
} from "@solana/kit"
import {
  type AllowedNumericKeypaths,
  getDefaultRequestTransformerForSolanaRpc,
  getDefaultResponseTransformerForSolanaRpc,
  innerInstructionsConfigs,
  jsonParsedAccountsConfigs,
  jsonParsedTokenAccountsConfigs,
  KEYPATH_WILDCARD,
  messageConfig,
} from "@solana/rpc-transformers"
import type {
  Asset,
  AssetsByOwnerRequest,
  GetAssetResponseList,
  GetTokenAccountsRequest,
  GetTokenAccountsResponse,
  SearchAssetsRequest,
  DisplayOptions,
} from "helius-sdk/types/das"
import type {
  GetAssetBatchRequest,
  GetAssetProofRequest,
  GetAssetProofResponse,
  GetAssetRequest,
} from "helius-sdk/types/types"
import { getThrottledTransport } from "./get-throttled-transport"

let memoizedKeypaths: AllowedNumericKeypaths<RpcApi<SolanaRpcApi & DASApi>>

function getAllowedNumericKeypaths(): AllowedNumericKeypaths<RpcApi<SolanaRpcApi & DASApi>> {
  if (!memoizedKeypaths) {
    memoizedKeypaths = {
      getAccountInfo: jsonParsedAccountsConfigs.map((c) => ["value", ...c]),
      getBlock: [
        ["transactions", KEYPATH_WILDCARD, "meta", "preTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
        ["transactions", KEYPATH_WILDCARD, "meta", "preTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "decimals"],
        ["transactions", KEYPATH_WILDCARD, "meta", "postTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
        ["transactions", KEYPATH_WILDCARD, "meta", "postTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "decimals"],
        ["transactions", KEYPATH_WILDCARD, "meta", "rewards", KEYPATH_WILDCARD, "commission"],
        ...innerInstructionsConfigs.map((c) => [
          "transactions",
          KEYPATH_WILDCARD,
          "meta",
          "innerInstructions",
          KEYPATH_WILDCARD,
          ...c,
        ]),
        ...messageConfig.map((c) => ["transactions", KEYPATH_WILDCARD, "transaction", "message", ...c] as const),
        ["rewards", KEYPATH_WILDCARD, "commission"],
      ],
      getClusterNodes: [
        [KEYPATH_WILDCARD, "featureSet"],
        [KEYPATH_WILDCARD, "shredVersion"],
      ],
      getInflationGovernor: [["initial"], ["foundation"], ["foundationTerm"], ["taper"], ["terminal"]],
      getInflationRate: [["foundation"], ["total"], ["validator"]],
      getInflationReward: [[KEYPATH_WILDCARD, "commission"]],
      getMultipleAccounts: jsonParsedAccountsConfigs.map((c) => ["value", KEYPATH_WILDCARD, ...c]),
      getProgramAccounts: jsonParsedAccountsConfigs.flatMap((c) => [
        ["value", KEYPATH_WILDCARD, "account", ...c],
        [KEYPATH_WILDCARD, "account", ...c],
      ]),
      getRecentPerformanceSamples: [[KEYPATH_WILDCARD, "samplePeriodSecs"]],
      getTokenAccountBalance: [
        ["value", "decimals"],
        ["value", "uiAmount"],
      ],
      getTokenAccountsByDelegate: jsonParsedTokenAccountsConfigs.map((c) => [
        "value",
        KEYPATH_WILDCARD,
        "account",
        ...c,
      ]),
      getTokenAccountsByOwner: jsonParsedTokenAccountsConfigs.map((c) => ["value", KEYPATH_WILDCARD, "account", ...c]),
      getTokenLargestAccounts: [
        ["value", KEYPATH_WILDCARD, "decimals"],
        ["value", KEYPATH_WILDCARD, "uiAmount"],
      ],
      getTokenSupply: [
        ["value", "decimals"],
        ["value", "uiAmount"],
      ],
      getTransaction: [
        ["meta", "preTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
        ["meta", "preTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "decimals"],
        ["meta", "preTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "uiAmount"],
        ["meta", "postTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
        ["meta", "postTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "decimals"],
        ["meta", "postTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "uiAmount"],
        ["meta", "rewards", KEYPATH_WILDCARD, "commission"],
        ...innerInstructionsConfigs.map((c) => ["meta", "innerInstructions", KEYPATH_WILDCARD, ...c]),
        ...messageConfig.map((c) => ["transaction", "message", ...c] as const),
      ],
      getVersion: [["feature-set"]],
      getVoteAccounts: [
        ["current", KEYPATH_WILDCARD, "commission"],
        ["delinquent", KEYPATH_WILDCARD, "commission"],
      ],
      simulateTransaction: [
        ["value", "loadedAccountsDataSize"],
        ...jsonParsedAccountsConfigs.map((c) => ["value", "accounts", KEYPATH_WILDCARD, ...c]),
        ...innerInstructionsConfigs.map((c) => ["value", "innerInstructions", KEYPATH_WILDCARD, ...c]),
      ],
    }
  }
  return memoizedKeypaths
}

type DASApi = {
  getAsset(args: GetAssetRequest): Asset
  getAssetBatch(args: GetAssetBatchRequest): Asset[]
  getAssetProof(args: GetAssetProofRequest): GetAssetProofResponse
  getAssetsByOwner(args: AssetsByOwnerRequest): GetAssetResponseList
  getTokenAccounts(args: GetTokenAccountsRequest): GetTokenAccountsResponse
  searchAssets(args: SearchAssetsRequest & { options: DisplayOptions }): GetAssetResponseList
}

const METHODS_TO_MAP = [
  "getAsset",
  "getAssetBatch",
  "getAssetProof",
  "getAssetsByOwner",
  "getTokenAccounts",
  "searchAssets",
]

const api = createJsonRpcApi<SolanaRpcApiMainnet & DASApi>({
  requestTransformer: (request) => {
    return METHODS_TO_MAP.includes(request.methodName)
      ? {
          ...request,
          params: (request.params as unknown[])[0],
        }
      : getDefaultRequestTransformerForSolanaRpc(DEFAULT_RPC_CONFIG)(request)
  },
  responseTransformer: (response, request) =>
    METHODS_TO_MAP.includes(request.methodName)
      ? typeof response === "object" && response !== null && "result" in response
        ? response.result
        : response
      : getDefaultResponseTransformerForSolanaRpc({
          allowedNumericKeyPaths: getAllowedNumericKeypaths(),
        })(response, request),
})

export function getRpc(url: string) {
  const defaultTransport = createDefaultRpcTransport({ url })
  const mainThrottledTransport = getThrottledTransport(defaultTransport, 450)
  const dasThrottledTransport = getThrottledTransport(defaultTransport, 100)

  function selectShard(method: string): RpcTransport {
    switch (method) {
      case "getAsset":
      case "getAssetBatch":
      case "getAssetProof":
      case "getAssetsByOwner":
      case "searchAssets":
        return dasThrottledTransport
      default:
        return mainThrottledTransport
    }
  }

  async function shardingTransport<TResponse>(...args: Parameters<RpcTransport>): Promise<TResponse> {
    const payload = args[0].payload as { method: string }
    const selectedTransport = selectShard(payload.method)
    return (await selectedTransport(...args)) as TResponse
  }

  return createRpc({ api, transport: shardingTransport })
}

export type SolanaClient = ReturnType<typeof getRpc>
