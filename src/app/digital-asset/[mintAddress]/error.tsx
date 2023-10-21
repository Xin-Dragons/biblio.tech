"use client"
import { Error } from "@/components/Error"

export default function ErrorPage() {
  return <Error title={"Error communicating with RPC host, please try again"} />
}
