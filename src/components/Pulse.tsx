import { Box, alpha, useTheme } from "@mui/material"
import { keyframes } from "@mui/system"

const pulse = keyframes`
  0%, 80%, 100% { 
    transform: scale(0.6);
    -webkit-transform: scale(0.6);
  } 40% { 
    transform: scale(1.0);
    -webkit-transform: scale(1.0);
  }`

export function Pulse() {
  const theme = useTheme()
  return (
    <Box
      sx={{
        width: "19px",
        height: "19px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // padding: "10px 40px 12px 40px",
        // margin: "0 auto",
        // boxShadow: "0px 0px 1px 1px #0000001a",
        "& > div": {
          width: "15px",
          height: "15px",
          borderRadius: "100%",
          position: "absolute",
          margin: "0 auto",
          border: `3px solid ${alpha(theme.palette.success.main, 0.5)}`,
          animation: `${pulse} 1.4s infinite ease-in-out`,
          animationFillMode: "both",
          "&:nth-child(1)": {
            backgroundColor: alpha(theme.palette.success.main, 1),
            // backgroundColor: "rgba(255,255,255,1)",
            animationDelay: "-0.1s",
          },
          "&:nth-child(2)": {
            animationDelay: "0.16s",
          },
          "&:nth-child(3)": {
            animationDelay: "0.42s",
            border: `3px solid ${alpha(theme.palette.success.main, 0.5)}`,
          },
          "&:nth-child(4)": {
            border: `3px solid ${alpha(theme.palette.success.main, 0.3)}`,
            animationDelay: "-0.42s",
          },
        },
      }}
    >
      <div />
      <div />
      <div />
      <div />
    </Box>
  )
}
