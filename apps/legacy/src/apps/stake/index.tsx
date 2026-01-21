import * as anchor from "@coral-xyz/anchor"
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { PropsWithChildren, createContext, useContext } from "react"
import idl from "./idl/stake.json"
import { Stake } from "./types/stake"

const programId = new anchor.web3.PublicKey(idl.metadata.address)

const Context = createContext<anchor.Program<Stake> | undefined>(undefined)

export const StakeProvider = ({ children }: PropsWithChildren) => {
  const wallet = useAnchorWallet()
  const { connection } = useConnection()
  const provider = new anchor.AnchorProvider(connection, wallet!, {})

  const stake = new anchor.Program(idl as any, programId, provider)
  return <Context.Provider value={stake}>{children}</Context.Provider>
}

export const useStake = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useStake must be used in a StakeProvider")
  }

  return context
}
