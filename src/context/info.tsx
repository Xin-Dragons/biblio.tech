import { Card, CardContent, Dialog, List, ListItem, Stack, Typography } from "@mui/material"
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
  content: ReactNode[]
}

type Information = {
  [key: string]: InfoItem
}

const information: Information = {
  vault: {
    title: "The Vault",
    content: [
      <Typography>
        The Vault is a{" "}
        <Typography color="primary" fontWeight="bold" display="inline">
          self-custodial locking system
        </Typography>{" "}
        for NFTs, pNFTs and NFT Editions.
      </Typography>,
      <Typography>
        Adding items to The Vault can help{" "}
        <Typography color="primary" fontWeight="bold" display="inline">
          protect them from wallet drains
        </Typography>{" "}
        when interacting with malicious dApps.
      </Typography>,
      <Typography>
        <Typography color="primary" fontWeight="bold" display="inline">
          Items in The Vault are frozen
        </Typography>{" "}
        so if you accidentally sign a transaction to transfer assets, it will fail unless they are first unfrozen.
      </Typography>,
      <Typography>
        The Vault works in the same way as locked staking or borrowing from Sharky or Frakt, however the authority is
        delegated to a wallet of your choosing so the items can be unlocked{" "}
        <Typography color="primary" fontWeight="bold" display="inline">
          without needing to trust any third party program.
        </Typography>
      </Typography>,
      <Typography>
        You can choose to freeze with any of your linked wallets. Freeze with a wallet that doesn't contain the NFTs in
        order to{" "}
        <Typography color="primary" fontWeight="bold" display="inline">
          amplify the security of your assets
        </Typography>{" "}
        (it is far less likely for two of your wallets to both become compromised)
      </Typography>,
      <Typography>
        <Typography color="primary" display="inline">
          <strong>THE VAULT IS 100% TRUSTLESS</strong>
        </Typography>{" "}
        - it is simply a utility tool to allow you to transfer authority between wallets you own
      </Typography>,
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
              <List>
                {info?.content?.map((line, index) => (
                  <ListItem>
                    <Typography key={index}>{line}</Typography>
                  </ListItem>
                ))}
              </List>
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
