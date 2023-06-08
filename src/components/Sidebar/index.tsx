import { Box } from "@mui/material"
import { FC, ReactNode } from "react"

type SidebarProps = {
  children: ReactNode
}

export const Sidebar: FC<SidebarProps> = ({ children }) => {
  return (
    <Box
      sx={{
        position: "relative",
        width: "220px",
        borderRight: 1,
        borderColor: "divider",
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
