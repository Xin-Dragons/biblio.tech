import { Box } from "@mui/material"
import { FC, ReactNode } from "react"
import { useUiSettings } from "../../context/ui-settings"

type SidebarProps = {
  children: ReactNode
}

export const Sidebar: FC<SidebarProps> = ({ children }) => {
  // const { lightMode } = useUiSettings()
  return (
    <Box
      sx={{
        position: "relative",
        width: "220px",
        borderRight: 1,
        borderColor: "divider",
        // backgroundImage: lightMode ? "url(/books-lightest.svg)" : "url(/books-lighter.svg)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "bottom center",
        backgroundSize: "80%",
      }}
    >
      <Box
        sx={{
          width: "220px",
          height: "100%",
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            width: "100%",
            marginBottom: 5,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
