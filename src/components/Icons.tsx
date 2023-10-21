import { SvgIcon } from "@mui/material"
import Plane from "@/../public/plane.svg"

type Size = "small" | "medium" | "large"

export const Send = ({ size }: { size?: Size }) => (
  <SvgIcon fontSize={size}>
    <Plane />
  </SvgIcon>
)
