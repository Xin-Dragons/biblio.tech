import { getUser } from "./supabase"

export async function getWallets(publicKey: string) {
  const user = await getUser(publicKey)

  console.log(user)

  return user
}
