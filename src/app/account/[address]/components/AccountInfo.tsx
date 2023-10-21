import { Table, TableBody, TableCell, TableRow, Typography } from "@mui/material"

export function AccountInfo({ rows, dense }: { rows: Record<string, any>; dense?: boolean }) {
  return (
    <Table size={dense ? "small" : "medium"}>
      <TableBody>
        {Object.keys(rows).map((key, index) => (
          <TableRow key={index}>
            <TableCell>
              <Typography fontWeight="bold">{key}</Typography>
            </TableCell>
            <TableCell align="right">{rows[key]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
