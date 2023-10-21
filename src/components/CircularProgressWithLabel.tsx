import { Box, CircularProgress, CircularProgressProps } from "@mui/material"
import { FC, ReactNode } from "react"

interface CircularProgressWithLabelProps extends CircularProgressProps {
  children: ReactNode
}

export const CircularProgressWithLabel: FC<CircularProgressWithLabelProps> = (props) => {
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress {...props} size={props.size || "5rem"} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {props.children}
      </Box>
    </Box>
  )
}
