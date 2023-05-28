import { Close } from "@mui/icons-material"
import { Dialog, IconButton, Theme, useMediaQuery } from "@mui/material"
import { initial, noop } from "lodash"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"

export const DialogContext = createContext<{ renderItem: Function }>({ renderItem: noop })

export const DialogProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false)
  const [item, setItem] = useState<any>(null)

  useEffect(() => {
    if (item) {
      setOpen(true)
    }
  }, [item])

  function toggleOpen() {
    setOpen(!open)
  }

  function renderItem(Component: React.ElementType, props: any) {
    setItem(<Component {...props} />)
  }

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  return (
    <DialogContext.Provider value={{ renderItem }}>
      {children}
      <Dialog open={open} onClose={toggleOpen} maxWidth="lg" fullScreen={isXs}>
        <IconButton
          onClick={toggleOpen}
          sx={{ position: "fixed", top: "0.25em", right: "0.25em", background: "#1f1f1f", zIndex: 1000 }}
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
