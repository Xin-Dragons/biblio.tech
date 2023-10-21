import { getTensorCollections } from "@/helpers/tensor-server-actions"
import { Client } from "./Client"

export default async function TensorCollections() {
  const collections = await getTensorCollections()
  return <Client collections={collections} />
}
