"use client"
import { Box, Container, Slider, Stack, useMediaQuery } from "@mui/material"
import { FC, ReactNode, useEffect, useState } from "react"
import { useAccess } from "../../context/access"
import { TagList } from "../TagList"
import { Filters } from "../Filters"
import { Actions } from "../Actions"
import { useSelection } from "../../context/selection"
import { useNfts } from "../../context/nfts.tsx"

type ActionBarProps = {
  actions?: ReactNode
}

export const ActionBar: FC<ActionBarProps> = ({ actions }) => {
  // const [showTags, setShowTags] = useState<boolean>(false)
  const { isAdmin } = useAccess()
  const { selected, setSelected } = useSelection()
  const { filtered } = useNfts()
  const showMinMenu = useMediaQuery("(max-width:1050px)")

  // const collectionPage = !router.query.tag && !router.query.filter && !router.query.collectionId

  // useEffect(() => {
  //   if (!router.query.collectionId && !router.query.tag && !router.query.filter) {
  //     setShowTags(false)
  //   }
  // }, [router.query])

  const filtersShowing = useMediaQuery("(min-width:1300px)")

  function handleSelectionChange(value: number) {
    setSelected(filtered.slice(0, value).map((item) => item.nftMint))
  }

  return (
    <Stack>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{ padding: "0.5em 0 0.5em 0" }}
      >
        <Actions />
        {/* <Filters showTags={showTags} setShowTags={setShowTags} /> */}
      </Stack>
      {isAdmin && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" pl={1} pr={1}>
          <Box width="30%">
            {/* {!collectionPage && !showMinMenu && ( */}
            <>
              <Slider
                aria-label="Selection"
                value={selected.length}
                onChange={(e, value) => handleSelectionChange(value as number)}
                max={filtered.length}
              />
            </>
            {/* )} */}
          </Box>
          <Stack direction="row" justifyContent="flex-end">
            {/* {showTags && filtersShowing && <TagList clip />} */}
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
