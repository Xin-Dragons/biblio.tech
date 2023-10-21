import { RestClient } from "@hellomoon/api"

export const hmClient = new RestClient(process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY!)
