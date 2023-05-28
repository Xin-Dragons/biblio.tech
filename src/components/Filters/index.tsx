import { LabelOff, AttachMoney, Star, FilterAltOff, FilterAlt, Close, Label } from "@mui/icons-material"
import {
  Button,
  Card,
  CardContent,
  Chip,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material"
import { useNfts } from "../../context/nfts"
import { useRouter } from "next/router"
import { useFilters } from "../../context/filters"
import { useUiSettings } from "../../context/ui-settings"
import { FC, useEffect, useState } from "react"
import { Search } from "../Search"
import { TagList } from "../TagList"
import { Sort } from "../Sort"
import { useAccess } from "../../context/access"

type FiltersProps = {
  showTags: boolean
  setShowTags: Function
}

type StaticFiltersProps = {
  fullSize?: boolean
}

const StaticFilters: FC<StaticFiltersProps> = ({ fullSize }) => {
  const router = useRouter()
  const { isAdmin } = useAccess()
  const { showUntagged, setShowUntagged, showLoans, setShowLoans, showStarred, setShowStarred } = useFilters()

  const includeUnlabeledIcon = router.query.tag !== "untagged" && isAdmin
  const includeLoansIcon = router.query.filter !== "loans"
  const includeStarredControl = router.query.filter !== "starred"

  function toggleStarred() {
    setShowStarred(!showStarred)
  }

  return (
    <Stack spacing={2} direction={{ sm: "row", xs: "column" }} alignItems="center">
      {includeUnlabeledIcon &&
        (fullSize ? (
          <Button
            size="large"
            onClick={() => setShowUntagged(!showUntagged)}
            color="primary"
            variant={showUntagged ? "contained" : "outlined"}
            sx={{ fontWeight: "bold" }}
            fullWidth
          >
            <Stack direction="row" spacing={1}>
              <LabelOff />
              <Typography>Untagged</Typography>
            </Stack>
          </Button>
        ) : (
          <Tooltip title={showUntagged ? "Show all" : "Show only untagged"}>
            <IconButton onClick={() => setShowUntagged(!showUntagged)}>
              <LabelOff sx={{ color: showUntagged ? "#9c27b0" : "grey" }} />
            </IconButton>
          </Tooltip>
        ))}

      {includeLoansIcon &&
        (fullSize ? (
          <Button
            size="large"
            onClick={() => setShowLoans(!showLoans)}
            color="primary"
            variant={showLoans ? "contained" : "outlined"}
            sx={{ fontWeight: "bold" }}
            fullWidth
          >
            <Stack direction="row" spacing={1}>
              <AttachMoney />
              <Typography>Loaned</Typography>
            </Stack>
          </Button>
        ) : (
          <Tooltip title={showLoans ? "Show all" : "Show items with outstanding loans"}>
            <IconButton onClick={() => setShowLoans(!showLoans)}>
              <AttachMoney sx={{ color: showLoans ? "primary.main" : "grey" }} />
            </IconButton>
          </Tooltip>
        ))}

      {includeStarredControl &&
        (fullSize ? (
          <Button
            size="large"
            // icon={<Star />}
            onClick={toggleStarred}
            color="primary"
            variant={showStarred ? "contained" : "outlined"}
            sx={{ fontWeight: "bold" }}
            fullWidth
          >
            <Stack direction="row" spacing={1}>
              <Star />
              <Typography>Starred</Typography>
            </Stack>
          </Button>
        ) : (
          <Tooltip title={showStarred ? "Show all" : "Show only starred"}>
            <IconButton onClick={toggleStarred}>
              <Star
                sx={{ opacity: showStarred ? 1 : 0.55, color: showStarred ? "#faaf00" : "inherit" }}
                fontSize="inherit"
              />
            </IconButton>
          </Tooltip>
        ))}
    </Stack>
  )
}

export const Filters: FC<FiltersProps> = ({ showTags, setShowTags }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { isAdmin } = useAccess()

  function toggleShowTags() {
    setShowTags(!showTags)
  }

  function toggleDrawerOpen() {
    setDrawerOpen(!drawerOpen)
  }

  const collapseFilters = useMediaQuery("(max-width:1300px)")

  return (
    <Stack spacing={2} direction="row" justifyContent="flex-end" alignItems="center" sx={{ flexGrow: 1 }}>
      {!collapseFilters && (
        <Stack spacing={2} direction="row">
          {isAdmin && <StaticFilters />}
          <Search />
          <Sort />
        </Stack>
      )}
      {collapseFilters ? (
        <Tooltip title="Show filter menu">
          <Button onClick={toggleDrawerOpen} variant="outlined">
            Filters
          </Button>
        </Tooltip>
      ) : (
        isAdmin && (
          <Tooltip title="Show/hide tag filters">
            <IconButton onClick={toggleShowTags}>
              <Label color={showTags ? "primary" : "inherit"} />
            </IconButton>
          </Tooltip>
        )
      )}

      <Drawer open={drawerOpen} onClose={toggleDrawerOpen} anchor="bottom">
        <Card sx={{ minHeight: "50vh", width: "100vw", overflowY: "auto" }}>
          <CardContent>
            <IconButton sx={{ position: "absolute", top: "0.5em", right: "0.5em" }} onClick={toggleDrawerOpen}>
              <Close />
            </IconButton>
            <Stack spacing={2}>
              <Typography variant="h5">Apply filters</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ maxWidth: "100%" }}>
                <Search large />
                <Sort large />
              </Stack>
              {isAdmin && (
                <>
                  <Typography variant="h6" textTransform="uppercase">
                    Filters
                  </Typography>
                  <StaticFilters fullSize />
                </>
              )}

              {isAdmin && (
                <>
                  <Typography variant="h6" textTransform="uppercase">
                    Tags
                  </Typography>
                  <TagList clearAll={false} />
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Drawer>
    </Stack>
  )
}
