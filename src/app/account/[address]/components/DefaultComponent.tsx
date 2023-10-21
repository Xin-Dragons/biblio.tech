import { CheckCross } from "@/components/CheckCross"
import { Table, TableBody, TableCell, TableRow, Typography } from "@mui/material"

export function DefaultComponent({ data }: { data: any }) {
  return (
    <Table>
      <TableBody>
        {Object.keys(data).map((key, index) => {
          const value = data[key]
          return (
            <TableRow key={index}>
              <TableCell>
                <Typography>{key}</Typography>
              </TableCell>
              <TableCell>
                {typeof value === "boolean" && <CheckCross value={value} />}
                {typeof value === "string" && <Typography>{value}</Typography>}
                {Array.isArray(value) && <Typography>{JSON.stringify(value, undefined, 2)}</Typography>}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
