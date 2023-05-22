import { Dialog } from "@mui/material"
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

  return (
    <DialogContext.Provider value={{ renderItem }}>
      {children}
      <Dialog open={open} onClose={toggleOpen} maxWidth="lg">
        {item}
      </Dialog>
    </DialogContext.Provider>
  )
}

export const useDialog = () => {
  return useContext(DialogContext)
}
