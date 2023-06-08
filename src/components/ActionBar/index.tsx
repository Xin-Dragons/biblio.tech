import { Container, Stack, useMediaQuery } from "@mui/material"
import { FC, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useWallet } from "@solana/wallet-adapter-react"
import { useAccess } from "../../context/access"
import { useRouter } from "next/router"
import { TagList } from "../TagList"
import { Filters } from "../Filters"
import { Actions } from "../Actions"

export const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
)

type ActionBarProps = {
  nfts: any
  filtered: any
}

export const ActionBar: FC<ActionBarProps> = () => {
  const [showTags, setShowTags] = useState<boolean>(false)
  const { isAdmin } = useAccess()
  const wallet = useWallet()
  const router = useRouter()

  useEffect(() => {
    if (!router.query.collectionId && !router.query.tag && !router.query.filter) {
      setShowTags(false)
    }
  }, [router.query])

  const filtersShowing = useMediaQuery("(min-width:1300px)")

  return (
    <Container maxWidth={false} sx={{ borderBottom: 1, borderColor: "divider", paddingLeft: `0.75em !important` }}>
      <Stack direction="column">
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
          sx={{ padding: "0.5em 0 0.5em 0" }}
        >
          {wallet.connected && <Actions />}
          <Filters showTags={showTags} setShowTags={setShowTags} />
        </Stack>
        {isAdmin && (
          <Stack direction="row" justifyContent="flex-end">
            {showTags && filtersShowing && <TagList clip />}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
