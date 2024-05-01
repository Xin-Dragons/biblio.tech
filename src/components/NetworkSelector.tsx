import { FormControl, InputLabel, MenuItem, Select, Stack } from "@mui/material"
import { Cluster, useCluster } from "../context/cluster"

export function NetworkSelector() {
  const { cluster, setCluster } = useCluster()

  return (
    <FormControl size="small" sx={{ minWidth: 130 }}>
      <InputLabel id="network">Network</InputLabel>
      <Select value={cluster} onChange={(e) => setCluster(e.target.value as Cluster)} size="small" label="Network">
        <MenuItem value={Cluster.MAINNET}>Mainnet</MenuItem>
        <MenuItem value={Cluster.DEVNET}>Devnet</MenuItem>
      </Select>
    </FormControl>
  )
}
