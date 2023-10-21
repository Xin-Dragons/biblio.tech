import { getSmartMoney } from "../get-smart-money"
import { HelloMoonLeaderboard } from "../HelloMoonLeaderboard"

export default async function SmartMoney() {
  const collections = await getSmartMoney("topSocialBuying", 1)

  return <HelloMoonLeaderboard collections={collections} title="Social buying" filter="topSocialBuying" />
}
