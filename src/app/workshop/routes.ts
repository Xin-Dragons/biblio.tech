import { routes as nftSuiteRoutes } from "./nft-suite/routes"
import { routes as tokenToolRoutes } from "./token-tool/routes"
import { routes as snapshotRoutes } from "./snapshot/routes"

export const routes = {
  snapshot: {
    title: "Snapshot",
    routes: snapshotRoutes,
  },
  nftSuite: {
    title: "NFT Suite",
    routes: nftSuiteRoutes,
  },
  tokenTool: {
    title: "Token Tool",
    routes: tokenToolRoutes,
  },
}
