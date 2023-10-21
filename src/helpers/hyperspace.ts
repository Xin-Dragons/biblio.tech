"use server"

import { HyperspaceClient } from "hyperspace-client-js"
import { SortOrderEnum, TimePeriodEnum, WalletStat } from "hyperspace-client-js/dist/sdk"

const hsClient = new HyperspaceClient(process.env.HYPERSPACE_API_KEY!)

export async function getWallets(sort = "volume_bought", period = "ONE_DAY") {
  try {
    const results = await hsClient.getWalletStats({
      condition: {
        timePeriod: period as TimePeriodEnum,
      },
      orderBy: { field_name: `${sort}${period === "ONE_DAY" ? "_1day" : ""}`, sort_order: "DESC" as SortOrderEnum },
    })

    return results.getWalletStats.wallet_stats as WalletStat[]
  } catch (err) {
    console.log("Error getting top wallets")
    return []
  }
}

export async function getMarketplaceSnapshot() {
  const { getUpcomingProjectsRaw } = await hsClient.getUpcomingProjects({})

  console.log(getUpcomingProjectsRaw.upcoming_projects)
}

export async function getCollections(projects: string[]) {
  console.log({ projects })
  const projs = await hsClient.getProjects({
    condition: { projectIds: projects },
  })

  console.log(projs)
}
