import { Card, CardContent, Dialog, Stack, Typography } from "@mui/material"
import { noop } from "lodash"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"

type InfoContextProps = {
  toggleInfo: Function
}

const initial = {
  toggleInfo: noop,
}

type InfoType = "vault"

type InfoItem = {
  title: string
  content: string[]
}

type Information = {
  [key: string]: InfoItem
}

const information: Information = {
  vault: {
    title: "The Vault",
    content: [
      `The Vault is a self-custodial locking system for NFTs, pNFTs and NFT Editions.`,
      `Adding items to The Vault can help to protect them from wallet drains when interacting with malicious dApps. Items
      in The Vault are frozen so if you accidentally sign a transaction to transfer assets, it will fail unless they are
      first unfrozen.`,
      `The Vault works in the same way as locked staking or borrowing from Sharky or Frakt, however the authority is
      delegated to the holding wallet so the items can be unlocked without needing to trust any third party program.`,
      `The Vault will not protect your assets in the event of your private key being compromised as the malicious user
      will have the same access to unlock any items locked in the Vault, however it may buy enough time to be able to
      transfer them to a new wallet.`,
      `The Vault V2 will be coming soon, this builds on the same trustless self custodial locking, but increases security
      exponentially, even in the case of your private key being compromised.`,
    ],
  },
}

export const InfoContext = createContext<InfoContextProps>(initial)

export const InfoProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<InfoItem | null>(null)

  function toggleInfo(type: InfoType) {
    const info = information[type]
    setInfo(info)
    setOpen(!open)
  }

  return (
    <InfoContext.Provider value={{ toggleInfo }}>
      {children}
      <Dialog maxWidth="lg" open={open} onClose={() => setOpen(false)}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h4">{info?.title}</Typography>
              <Typography variant="h6">
                {info?.content?.map((line, index) => (
                  <>
                    {index !== 0 && (
                      <>
                        <br />
                        <br />
                      </>
                    )}
                    <span key={index}>{line}</span>
                  </>
                ))}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
    </InfoContext.Provider>
  )
}

export const useInfo = () => {
  return useContext(InfoContext)
}
