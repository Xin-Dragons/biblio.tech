import * as anchor from "@coral-xyz/anchor"
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { PropsWithChildren, createContext, useContext } from "react"
import idl from "./idl/crow.json"
import { Crow } from "./types/crow"

const programId = new anchor.web3.PublicKey(idl.metadata.address)

const Context = createContext<anchor.Program<Crow> | undefined>(undefined)

export const CrowProvider = ({ children }: PropsWithChildren) => {
  const wallet = useAnchorWallet()
  const { connection } = useConnection()
  const provider = new anchor.AnchorProvider(connection, wallet!, {})

  const crow = new anchor.Program(idl as any, programId, provider)
  return <Context.Provider value={crow}>{children}</Context.Provider>
}

export const useCrow = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useCrow must be used in a CrowProvider")
  }

  return context
}
