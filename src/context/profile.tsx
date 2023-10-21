"use client"
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react"
import { usePublicKey } from "./public-key"
import { getProfile } from "@/app/helpers/supabase"
import { Profile } from "@/types/database"

const Context = createContext<Profile | undefined | null>(undefined)

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<any | null>(null)
  const connectedPublicKey = usePublicKey()

  useEffect(() => {
    ;(async () => {
      const profile = await getProfile(connectedPublicKey)
      setProfile(profile)
    })()
  }, [connectedPublicKey])

  return <Context.Provider value={profile}>{children}</Context.Provider>
}

export const useProfile = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useLinkedWallets must be used in a LinkedWalletsProvider")
  }

  return context
}
