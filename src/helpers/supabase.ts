import { createClient } from "@supabase/supabase-js"

if (!process.env.DB_URL || !process.env.DB_SECRET) {
  throw new Error("Missing db env vars")
}

const supabase = createClient(process.env.DB_URL, process.env.DB_SECRET)

export async function getUser(publicKey: string) {
  const { data, error } = await supabase.rpc("get_biblio_user", {
    pk: publicKey,
  })

  if (error) {
    console.log(error)
    throw new Error("Error looking up user from wallet")
  }

  return data as any
}
