import { uniqBy } from "lodash"
import { Database } from "../../types/supabase"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient<Database>(process.env.NEXT_PUBLIC_DATABASE_URL!, process.env.NEXT_PUBLIC_DATABASE_TOKEN!)

export async function collectionSearch(input: string) {
  const [exact, fuzzy, search] = await Promise.all([
    supabase.from("tensor_collections").select("name, slug, tensor_verified").ilike("name", input),
    supabase.from("tensor_collections").select("name, slug, tensor_verified").ilike("name", `%${input}%`),
    supabase.from("tensor_collections").select("name, slug, tensor_verified").textSearch("fts", input),
  ])

  console.log({ exact, fuzzy, search })
  const rtn = uniqBy([...(exact.data || []), ...(fuzzy.data || []), ...(search.data || [])], (item: any) => item.slug)

  return rtn
}

export async function getCollection(slug: string) {
  const { data, error } = await supabase.from("tensor_collections").select("*").eq("slug", slug).limit(1).single()

  if (error) {
    throw new Error("Error looking up collection")
  }

  return data
}

export async function getCollections(ids: string[]) {
  const { data, error } = await supabase.from("tensor_collections").select("*").in("slug", ids)
  if (error) {
    throw new Error("Error looking up collections")
  }

  console.log(data)

  return data
}

export async function getProfile(wallet: string) {
  const { data, error } = await supabase.rpc("get_biblio_user", {
    pk: wallet,
  })

  if (error) {
    throw new Error("Error looking up user from wallet")
  }

  return data as any
}
