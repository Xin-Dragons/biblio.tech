import {
  Box,
  CircularProgress,
  Container,
  IconButton,
  LinearProgress,
  Link,
  Stack,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material"
import { FC, ReactNode } from "react"
import { useDatabase } from "../../context/database"
import SyncIcon from "@mui/icons-material/Sync"
import { AccountBalanceWallet } from "@mui/icons-material"
import { useNfts } from "../../context/nfts.tsx"
import { Time } from "./Time"
import { ScrollingBrice } from "./ScrollingBrice"
import { TPS } from "./Tps"
import { Balance } from "./Balance"
import { PortfolioValue } from "./PortfolioValue"

const FooterSection: FC<{ children: ReactNode; first?: boolean; right?: boolean; last?: boolean }> = ({
  children,
  first,
  right,
  last,
}) => {
  return (
    <Box
      sx={{
        borderRight: right ? 0 : 1,
        borderLeft: right ? 1 : 0,
        borderColor: "divider",
        paddingLeft: first ? 0 : 2,
        paddingRight: right ? (last ? 0 : 2) : 2,
        verticalAlign: "middle",
      }}
    >
      {children}
    </Box>
  )
}

export const Footer: FC = () => {
  const { syncing, sync, syncProgress } = useDatabase()
  const attachWeb = useMediaQuery((theme: Theme) => theme.breakpoints.down("xl"))
  // const { filtered, nfts } = useNfts()
  // const { db } = useDatabase()

  const isSmall = useMediaQuery("(max-width:930px)")
  const hideTps = useMediaQuery("(max-width:715px)")
  const isTiny = useMediaQuery("(max-width:620px)")
  const isMobile = useMediaQuery("(max-width:480px)")
  const hideBalance = useMediaQuery("(max-width:400px)")
  const hideWeb = useMediaQuery("(max-width:1100px)")

  return (
    <Box sx={{ borderTop: 1, borderColor: "divider" }} component="footer" color="grey">
      <Container maxWidth={false}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" height="34px">
          {isMobile ? (
            <Stack direction="row" alignItems="center">
              <FooterSection first>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Link href="https://dandies.xyz" target="_blank" rel="noreferrer">
                    <img width="24px" src="/logo.png" style={{ display: "block" }} />
                  </Link>
                </Stack>
              </FooterSection>
              <FooterSection>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Link href="https://hellomoon.io/developers" target="_blank" rel="noreferrer">
                    <img width="20px" src="/hello-moon.svg" style={{ display: "block" }} />
                  </Link>
                </Stack>
              </FooterSection>
              {/* <FooterSection>
                <PortfolioValue />
              </FooterSection> */}
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center">
              {/* <FooterSection first>
                <Online>
                  <WifiIcon color="success" fontSize="small" />
                </Online>
                <Offline>
                  <WifiOffIcon color="error" fontSize="small" />
                </Offline>
              </FooterSection> */}
              {!isSmall && (
                <FooterSection first>
                  <Time />
                </FooterSection>
              )}
              <FooterSection first={isTiny}>
                <ScrollingBrice />
              </FooterSection>
              {!hideTps && (
                <FooterSection>
                  <TPS />
                </FooterSection>
              )}

              <FooterSection>
                <Stack direction="row" spacing={1} alignItems="center">
                  {!isSmall && (
                    <Typography variant="body2" fontWeight="bold">
                      Built by
                    </Typography>
                  )}
                  <Link href="https://dandies.xyz" target="_blank" rel="noreferrer">
                    <img width="24px" src="/logo.png" style={{ display: "block" }} />
                  </Link>
                </Stack>
              </FooterSection>
              <FooterSection>
                <Stack direction="row" spacing={1} alignItems="center">
                  {!isSmall && (
                    <Typography variant="body2" fontWeight="bold">
                      Powered by
                    </Typography>
                  )}
                  <Link href="https://hellomoon.io/developers" target="_blank" rel="noreferrer">
                    <img width="20px" src="/hello-moon.svg" style={{ display: "block" }} />
                  </Link>
                </Stack>
              </FooterSection>
              {/* {attachWeb && (
                // <FooterSection>
                //   <PortfolioValue />
                // </FooterSection>
              )} */}
            </Stack>
          )}
          {!attachWeb && !isSmall && !hideWeb && (
            <Box sx={{ padding: 0.25, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
              {/* <PortfolioValue /> */}
            </Box>
          )}

          <Stack direction="row" alignItems="center">
            {/* <FooterSection right>
              <Typography fontWeight="bold" sx={isMobile ? { fontSize: "10px !important" } : {}}>
                {isSmall ? "" : "Showing "}
                {filtered.length} {isSmall ? "/" : "of"} {nfts.length}
              </Typography>
            </FooterSection> */}
            {!hideBalance && !hideWeb && (
              <FooterSection right>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  // onClick={() => toggleSolTransferOpen()}
                  sx={{ cursor: "pointer" }}
                >
                  <AccountBalanceWallet fontSize="small" />
                  <Balance />
                </Stack>
              </FooterSection>
            )}

            <FooterSection right last>
              <Tooltip title="Refetch data">
                {syncing ? (
                  <CircularProgress size="1rem" />
                ) : (
                  <IconButton onClick={sync as any} disabled={syncing} size="small">
                    <SyncIcon sx={{ cursor: "pointer" }} />
                  </IconButton>
                )}
              </Tooltip>
            </FooterSection>
          </Stack>
        </Stack>
      </Container>
      {syncing && (
        <LinearProgress
          value={syncProgress}
          variant="determinate"
          sx={{ height: "2px", position: "fixed", bottom: 0, left: 0, right: 0 }}
        />
      )}
    </Box>
  )
}
