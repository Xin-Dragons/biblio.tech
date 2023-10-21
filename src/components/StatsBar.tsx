"use client"

import { bigNumberFormatter } from "@/helpers/utils"
import {
  ArrowUpward,
  ArrowDownward,
  Language,
  ArrowForward,
  ArrowForwardIos,
  ArrowBackIos,
  ArrowBackIosNew,
} from "@mui/icons-material"
import { Stack, Typography, SvgIcon, CircularProgress, Link, Box, Button, IconButton } from "@mui/material"
import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from "react"

function StatsItem({ title, children }: PropsWithChildren & { title: string }) {
  return (
    <Stack alignItems="center">
      <Stack direction="row" alignItems="center" spacing={1} sx={{ whiteSpace: "nowrap" }}>
        {children}
      </Stack>
      <Typography variant="body2" textTransform="uppercase" sx={{ whiteSpace: "nowrap" }}>
        {title}
      </Typography>
    </Stack>
  )
}

export function StatsBar({ title, items }: { title: ReactNode; items: { title: string; value: ReactNode }[] }) {
  const ref = useRef<HTMLElement | null>(null)
  const [isScrollable, setIsScrollable] = useState(false)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  function onResize() {
    const isScrollable = (ref?.current?.scrollWidth || 0) > (ref?.current?.clientWidth || 0)
    setIsScrollable(isScrollable)
  }

  function onScoll() {
    const scrollLeft = ref.current?.scrollLeft || 0
    const scrollWidth = ref.current?.scrollWidth || 0
    const width = ref.current?.clientWidth || 0
    const maxScroll = scrollWidth - width - 0.5
    const isMaxRight = scrollLeft >= maxScroll
    setShowRightArrow(!isMaxRight)
    setShowLeftArrow(scrollLeft > 0)
  }

  useEffect(() => {
    onScoll()
    onResize()
    ref?.current?.addEventListener("scroll", onScoll)
    window.addEventListener("resize", onResize)
  }, [])

  let scrollToken = null

  useEffect(() => {
    clearInterval(scrollToken)
    return () => {
      clearInterval(scrollToken)
    }
  })

  function scroll(left: number) {
    clearInterval(scrollToken)
    scrollToken = setInterval(() => ref.current?.scrollBy({ left }), 20)
  }

  function stopScroll() {
    console.log("stopping")
    clearInterval(scrollToken)
  }

  return (
    <Stack direction="row" sx={{ overflow: "hidden" }} alignItems="center">
      {isScrollable && (
        <IconButton
          size="small"
          onMouseEnter={() => scroll(-1)}
          onMouseDown={() => scroll(-3)}
          onMouseUp={() => scroll(-1)}
          onMouseLeave={stopScroll}
          disabled={!showLeftArrow}
        >
          <ArrowBackIosNew />
        </IconButton>
      )}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ overflowY: "scroll", "&::-webkit-scrollbar": { display: "none" } }}
        ref={ref as any}
      >
        {title}
        <Stack direction="row" spacing={2} alignItems="center">
          {items.map((item) => (
            <StatsItem title={item.title}>{item.value}</StatsItem>
          ))}
        </Stack>
      </Stack>
      {isScrollable && (
        <IconButton
          onMouseEnter={() => scroll(1)}
          onMouseDown={() => scroll(3)}
          onMouseUp={() => scroll(1)}
          onMouseLeave={stopScroll}
          // onTouchStart={() => scroll(3)}
          // onTouchEnd={stopScroll}
          disabled={!showRightArrow}
          size="small"
        >
          <ArrowForwardIos />
        </IconButton>
      )}
    </Stack>
  )
}
