"use client"

import { Box, Table, TableBody, TableHead } from "@mui/material"
import { useState, useRef, useLayoutEffect, ReactElement, FC } from "react"
import AutoSizer from "react-virtualized-auto-sizer"
import { VirtualTable } from "./VirtualTable"

export function ActivityLog({ activity, Row }: { activity: any[]; Row: FC<any> }) {
  const [itemSize, setItemSize] = useState(82.5)
  const [widths, setWidths] = useState<number[]>([])
  const ref = useRef<HTMLTableElement | null>(null)

  useLayoutEffect(() => {
    if (activity.length) {
      setItemSize(ref.current?.offsetHeight || 0)
      const rowWidths = Array.from(ref.current?.querySelectorAll("td") as NodeListOf<HTMLTableCellElement>).map(
        (node) => node.offsetWidth
      )
      setWidths(rowWidths)
    }
  }, [activity])

  return (
    <Box height="100%" width="100%" position="relative">
      {!!activity.length && (
        <Table ref={ref} style={{ width: "100%", position: "absolute", visibility: "hidden" }}>
          <TableBody>
            <Row sale={activity[0]} />
          </TableBody>
        </Table>
      )}

      <AutoSizer defaultWidth={1920} defaultHeight={1080}>
        {({ width, height }: { width: number; height: number }) => {
          return (
            <VirtualTable
              height={height}
              width={width}
              itemCount={activity.length}
              itemSize={itemSize}
              itemData={activity}
              overscanCount={5}
              // @ts-ignore
              row={({ index, data }) => <Row sale={data[index]} widths={widths} />}
            />
          )
        }}
      </AutoSizer>
    </Box>
  )
}
