"use client"

import { DigitalAsset, margins } from "@/components/DigitalAsset"
import { Items } from "@/components/Items"
import { SelectControls } from "@/components/SelectControls"
import { useFiltered } from "@/context/filtered"
import { Card, CardContent, Drawer, Stack, Theme, Typography, useMediaQuery } from "@mui/material"
import { useState } from "react"
import { useSort } from "@/context/sort"
import { useOwnedAssets } from "@/context/owned-assets"
import { Collection } from "@/components/Collection"
import { Actions } from "@/components/Actions"

export default function All({ params, edit }: { params: Record<string, string>; edit?: boolean }) {
  const { filter } = useFiltered()
  const { doSort } = useSort()
  const [actionDrawerShowing, setActionDrawerShowing] = useState(false)

  const { digitalAssets } = useOwnedAssets()

  const filtered = doSort(filter(digitalAssets))

  return (
    <Stack height="100%" spacing={1}>
      <Items items={filtered} Component={(props) => <DigitalAsset {...props} condensed walletView edit={edit} />} />
      <Stack direction="row" justifyContent="space-between">
        <SelectControls items={filtered} />
        {edit && <Actions />}
        {/* <Stack direction="row" spacing={1}>
          <Button variant="contained" disabled={!selected.length} onClick={toggleActionDrawer}>
            Actions
          </Button>
        </Stack> */}
      </Stack>
      <Drawer anchor="right" open={actionDrawerShowing} onClose={() => setActionDrawerShowing(false)}>
        <Card sx={{ height: "100%" }}>
          <CardContent sx={{ height: "100%" }}>
            {/* <Stack spacing={2} justifyContent="flex-end" height="100%">
              <Button variant="outlined" size="small">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Send size="small" />
                  <Typography>SEND</Typography>
                </Stack>
              </Button>
              <Alert severity="error">DANGER ZONE</Alert>
              <Button variant="outlined" size="small" color="error">
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocalFireDepartment />
                  <Typography>BURN</Typography>
                </Stack>
              </Button>
            </Stack> */}
          </CardContent>
        </Card>
      </Drawer>
    </Stack>
  )
}
