import { Dialog } from "@mui/material";
import { createContext, useContext, useEffect, useState } from "react";

export const DialogContext = createContext()

export const DialogProvider = ({ children }) => {
  const [open, setOpen] = useState(false)
  const [item, setItem] = useState(null);

  useEffect(() => {
    if (item) {
      setOpen(true)
    }
  }, [item])

  function toggleOpen() {
    setOpen(!open);
  }

  function renderItem(Component, props) {
    setItem(<Component {...props} />)
  }
  
  return (
    <DialogContext.Provider value={{ renderItem }}>
      { children }
      <Dialog open={open} onClose={toggleOpen} maxWidth="lg">
        { item }
      </Dialog>
      
    </DialogContext.Provider>
  )
}

export const useDialog = () => {
  return useContext(DialogContext)
}