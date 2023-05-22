import { Box, IconButton } from "@mui/material"
import { FC, ReactNode, useEffect, useState } from "react"
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew"
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos"

type SidebarProps = {
  children: ReactNode
}

export const Sidebar: FC<SidebarProps> = ({ children }) => {
  return (
    <Box
      sx={{
        position: "relative",
        width: "220px",
        borderRight: "1px solid #333",
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
