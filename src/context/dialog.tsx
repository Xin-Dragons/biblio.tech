import { Close } from "@mui/icons-material"
import { Dialog, IconButton, Theme, alpha, useMediaQuery } from "@mui/material"
import { initial, noop } from "lodash"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useTheme } from "./theme"
import { useRouter } from "next/router"

export const DialogContext = createContext<{ renderItem: Function; setOpen: Function }>({
  renderItem: noop,
  setOpen: noop,
})

export const DialogProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false)
  const [item, setItem] = useState<any>(null)
  const [disableFullscreen, setDisableFullscreen] = useState(false)
  const theme = useTheme()
  const router = useRouter()

  useEffect(() => {
    if (item) {
      setOpen(true)
    }
  }, [item])

  function toggleOpen() {
    setOpen(!open)
  }

  function renderItem(Component: React.ElementType, props: any, disableFullscreen?: boolean) {
    setItem(<Component {...props} />)
    setDisableFullscreen(!!disableFullscreen)
  }

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  useEffect(() => {
    setOpen(false)
  }, [router.query])

  return (
    <DialogContext.Provider value={{ renderItem, setOpen }}>
      {children}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullScreen={isXs && !disableFullscreen}>
        <IconButton
          onClick={toggleOpen}
          sx={{
            position: "fixed",
            top: "0.25em",
            right: "0.25em",
            background: alpha(theme.palette.background.default, 0.8),
            zIndex: 1000,
          }}
          size="large"
        >
          <Close fontSize="large" />
        </IconButton>
        {item}
      </Dialog>
    </DialogContext.Provider>
  )
}

export const useDialog = () => {
  return useContext(DialogContext)
}
