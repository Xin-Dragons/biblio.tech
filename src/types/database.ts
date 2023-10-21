import { Database } from "./supabase"

export type Collection = Database["public"]["Tables"]["tensor_collections"]["Row"]
export type Biblio = Database["public"]["Tables"]["biblio"]["Row"]
export type BiblioWallet = Database["public"]["Tables"]["biblio-wallets"]["Row"]
export type Profile = Biblio & { "biblio-wallets": BiblioWallet[] }
