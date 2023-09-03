import { Table, TableBody } from "@mui/material"
import { forwardRef, HTMLProps, useContext, createContext, ReactNode, useRef, useState } from "react"
import { FixedSizeListProps, FixedSizeList } from "react-window"

const Inner = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(function Inner({ children, ...rest }, ref) {
  const { header, footer, top } = useContext(VirtualTableContext)
  return (
    <div {...rest} ref={ref}>
      <Table sx={{ top, position: "absolute", width: "100%" }}>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  )
})

/** Context for cross component communication */
const VirtualTableContext = createContext<{
  top: number
  setTop: (top: number) => void
  header: React.ReactNode
  footer: React.ReactNode
}>({
  top: 0,
  setTop: (value: number) => {},
  header: <></>,
  footer: <></>,
})

/** The virtual table. It basically accepts all of the same params as the original FixedSizeList.*/
export function VirtualTable({
  row,
  header,
  footer,
  ...rest
}: {
  header?: ReactNode
  footer?: ReactNode
  row: FixedSizeListProps["children"]
} & Omit<FixedSizeListProps, "children" | "innerElementType">) {
  const listRef = useRef<FixedSizeList | null>()
  const [top, setTop] = useState(0)

  return (
    <VirtualTableContext.Provider value={{ top, setTop, header, footer }}>
      <FixedSizeList
        {...rest}
        innerElementType={Inner}
        onItemsRendered={(props) => {
          const style =
            listRef.current &&
            // @ts-ignore private method access
            listRef.current._getItemStyle(props.overscanStartIndex)
          setTop((style && style.top) || 0)

          // Call the original callback
          rest.onItemsRendered && rest.onItemsRendered(props)
        }}
        ref={(el) => (listRef.current = el)}
      >
        {row}
      </FixedSizeList>
    </VirtualTableContext.Provider>
  )
}
