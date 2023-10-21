import { Alert, Button, Stack } from "@mui/material"
import { useRouter } from "next/navigation"

export function Error({ title }: { title: String }) {
  const router = useRouter()
  return (
    <Alert
      severity="error"
      action={
        <Button onClick={() => router.refresh()} color="error">
          Reload
        </Button>
      }
    >
      {title}
    </Alert>
  )
}
