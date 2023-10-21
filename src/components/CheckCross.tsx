import { Check, Close } from "@mui/icons-material"

export function CheckCross({ value }: { value?: boolean }) {
  return value ? <Check color="success" /> : <Close color="error" />
}
