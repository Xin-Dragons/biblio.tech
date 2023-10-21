import { ReactNode } from "react"
import BaseLayout from "../BaseLayout"

export default function Layout({
  children,
  sidebar,
  params,
}: {
  children: ReactNode
  sidebar: ReactNode
  params: Record<string, string>
}) {
  return <BaseLayout publicKey={params.publicKey} sidebar={sidebar} children={children} />
}
