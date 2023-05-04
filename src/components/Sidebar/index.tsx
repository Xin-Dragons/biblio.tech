import { Box, IconButton } from "@mui/material"
import { FC, useEffect, useState } from "react"
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

export const Sidebar: FC = ({ children, side = "left", defaultShowing = false }) => {
  const [showing, setShowing] = useState(!!defaultShowing)

  function toggleShowing() {
    setShowing(!showing)
  }

  useEffect(() => {
    setShowing(defaultShowing)
  }, [defaultShowing])

  // useEffect(() => {
  //   if (localShowing) {
  //     setShowing(!!defaultShowing)
  //   }
  // }, [defaultShowing])

  const Arrow = side === "left"
    ? showing ? ArrowBackIosNewIcon : ArrowForwardIosIcon
    : showing ? ArrowForwardIosIcon : ArrowBackIosNewIcon 
    
  return (
    <Box sx={{
      position: "relative",
      height: "calc(100vh - 195px)",
      width: "220px",

      // overflow: "visible",
      marginLeft: side === 'left'
        ? showing ? "0px !important" : "-244px !important"
        : 0,
      marginRight: side === 'right'
        ? showing ? "0px !important" : "-244px !important"
        : 0
      }}>
      <Box sx={{
        width: "220px",
        height: "100%",
        overflowY: "auto",
      }}>
        <Box sx={{
          width: "100%",
          marginBottom: 5,
        }}>
          { children}
        </Box>
      </Box>
      <IconButton sx={{
        position: "absolute",
        top: "50%",
        marginTop: "-20px",
        right: side === "left" ? "-35px" : "unset",
        left: side === "left" ? "unset" : "-35px",
      }} onClick={toggleShowing}>
        <Arrow />
      </IconButton>
    </Box>
  )

}