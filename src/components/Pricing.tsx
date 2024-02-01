import {
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material"
import { useAccess } from "../context/access"
import { getLevel } from "./NftTool/helpers/utils"
import { FEES } from "./NftTool/constants"
import { useEffect, useState } from "react"
import { toTitleCase } from "../helpers/utils"

export function Pricing({ tab: initialTab = "nftSuite" }: { tab: string }) {
  const { account } = useAccess()
  const [showing, setShowing] = useState(false)
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  return (
    <>
      <Button onClick={() => setShowing(true)}>Pricing</Button>
      <Dialog open={showing} onClose={() => setShowing(false)} maxWidth="md" fullWidth>
        <Card>
          <CardContent>
            <Container maxWidth="sm">
              <Stack spacing={2} alignItems="center">
                <Typography variant="h4" textAlign="center" textTransform="uppercase">
                  Pricing
                </Typography>
                <Typography textAlign="center" color="primary" width="100%">
                  All prices are in SOL and per change.
                  <br />
                  Your current fee level is highlighted in{" "}
                  <Typography component="span" sx={{ color: "gold.main" }}>
                    gold
                  </Typography>
                </Typography>
                <Tabs value={tab} onChange={(e, tab) => setTab(tab)}>
                  {Object.keys(FEES).map((type, index) => (
                    <Tab value={type} label={toTitleCase(type)} key={index} />
                  ))}
                </Tabs>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography sx={{ color: account === "basic" ? "gold.main" : "primary.main" }}>
                          Basic
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography sx={{ color: account === "advanced" ? "gold.main" : "primary.main" }}>
                          Advanced (1+)
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography sx={{ color: account === "pro" ? "gold.main" : "primary.main" }}>
                          Pro (5+)
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography sx={{ color: account === "unlimited" ? "gold.main" : "primary.main" }}>
                          Unlimited (10+)
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.keys(FEES[tab as keyof typeof FEES]).map((key, index) => {
                      return (
                        <TableRow key={index}>
                          <TableCell sx={{ textAlign: "right" }}>
                            <Typography color="primary">{toTitleCase(key)}</Typography>
                          </TableCell>
                          <TableCell sx={{ textAlign: "right" }}>
                            <Typography sx={{ color: account === "basic" ? "gold.main" : "default" }}>
                              {(FEES[tab as keyof typeof FEES][key as keyof object] as any).basic}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ textAlign: "right" }}>
                            <Typography sx={{ color: account === "advanced" ? "gold.main" : "default" }}>
                              {(FEES[tab as keyof typeof FEES][key as keyof object] as any).advanced}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ textAlign: "right" }}>
                            <Typography sx={{ color: account === "pro" ? "gold.main" : "default" }}>
                              {(FEES[tab as keyof typeof FEES][key as keyof object] as any).pro}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ textAlign: "right" }}>
                            <Typography sx={{ color: account === "unlimited" ? "gold.main" : "default" }}>
                              {0}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <Button onClick={() => setShowing(false)}>Dismiss</Button>
              </Stack>
            </Container>
          </CardContent>
        </Card>
      </Dialog>
    </>
  )
}
