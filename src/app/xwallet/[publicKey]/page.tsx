import { redirect } from "next/navigation"

export default function Page({ params }: { params: Record<string, string> }) {
  redirect(`/wallet/${params.publicKey}/assets`)
}
