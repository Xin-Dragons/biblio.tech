import { createClient } from "@supabase/supabase-js"

if (!process.env.DB_URL || !process.env.DB_SECRET) {
  throw new Error("Missing db env vars")
}

const supabase = createClient(process.env.DB_URL, process.env.DB_SECRET)

export async function getUser(publicKey: string) {
  console.log({ publicKey })
  const { data, error } = await supabase.rpc("get_biblio_user", {
    pk: publicKey,
  })

  if (error) {
    console.log(error)
    throw new Error("Error looking up user from wallet")
  }

  return data as any
}

export async function removeWalletFromUser(id: string, publicKey: string) {
  const wallet = await getBiblioWallet(publicKey)
  if (!wallet) {
    throw new Error("Wallet not found")
  }
  if (wallet.main) {
    throw new Error("Cannot unlink main wallet")
  }

  const { data, error } = await supabase
    .from("biblio-wallets")
    .update({
      active: false,
    })
    .eq("user_id", id)
    .eq("public_key", publicKey)

  if (error) {
    throw new Error("Error unlinking wallet")
  }

  return data
}

async function getBiblioWallet(publicKey: string, user_id?: string) {
  let query = supabase.from("biblio-wallets").select("*").eq("public_key", publicKey).is("active", true)

  if (user_id) {
    query = query.eq("user_id", user_id)
  }

  const { data, error } = await query.limit(1).maybeSingle()

  if (error) {
    console.log(error)
    throw new Error("Error looking up linked wallet")
  }

  return data
}

export async function addWalletToUser(id: string, publicKey: string, chain: string = "solana") {
  const wallet = await getBiblioWallet(publicKey)
  console.log({ wallet })
  if (wallet) {
    throw new Error("Wallet already linked to a Biblio account.")
  }
  const user = (await getOrCreateUser(publicKey)) as any

  const { data, error } = await supabase.from("biblio-wallets").upsert({
    public_key: user!.publicKey,
    user_id: id,
    chain,
    active: true,
  })

  if (error) {
    throw new Error("Error linking wallet to account")
  }

  return data
}

export async function getOrCreateUser(publicKey: string) {
  const { data, error } = await supabase.from("users").upsert({ publicKey }).select("*")

  if (error) {
    console.log(error)
    throw new Error("Error upserting user")
  }

  return data && data[0]
}

export async function deleteAccount(publicKey: string) {
  const user = await getUser(publicKey)

  if (!user) {
    throw new Error("Cannot find account to delete")
  }

  const mainPk = user.wallets.find((w: any) => w.main).public_key

  if (mainPk !== publicKey) {
    throw new Error(`Connect with ${mainPk} to delete your account`)
  }

  const { data, error } = await supabase.from("biblio").delete().eq("id", user.id)

  if (error) {
    throw new Error("Error deleting account")
  }

  return data
}

export async function createUser(publicKey: string) {
  const existing = await getUser(publicKey)
  if (existing.id) {
    throw new Error("Account already exists for wallet")
  }
  const user = await getOrCreateUser(publicKey)
  const { data, error }: { data: any; error: any } = await supabase
    .from("biblio")
    .insert({
      active: true,
    })
    .select("id")
    .limit(1)
    .single()

  if (error) {
    console.log("error")
    throw new Error("Error creating account")
  }

  const linkedWallet = await supabase.from("biblio-wallets").insert({
    user_id: data.id,
    public_key: user.publicKey,
    main: true,
  })

  if (linkedWallet.error) {
    console.log(linkedWallet.error)
    throw new Error("Error looking up user from wallet")
  }

  return data
}
