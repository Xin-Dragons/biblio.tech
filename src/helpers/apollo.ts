import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client"
import { GraphQLWsLink } from "@apollo/client/link/subscriptions"
import { ApolloLink, concat } from "apollo-link"
import fetch from "cross-fetch"
import { createClient } from "graphql-ws"
import { getMainDefinition } from "@apollo/client/utilities"

const API_KEY = process.env.TENSOR_API_KEY ?? ""

// if (!API_KEY) {
//   throw new Error("Missing Tensor API key")
// }

const authLink = new ApolloLink((operation, forward) => {
  operation.setContext({
    headers: {
      "X-TENSOR-API-KEY": "5f3fb4c5-4af3-4311-9631-74702168aa69",
    },
  })
  return forward(operation)
})

const httpLink = new HttpLink({ uri: "https://api.tensor.so/graphql", fetch })
const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://api.tensor.so/graphql",
    connectionParams: {
      authToken: API_KEY,
    },
  })
)

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return definition.kind === "OperationDefinition" && definition.operation === "subscription"
  },
  wsLink,
  concat(authLink, httpLink as any) as any
)

const client = new ApolloClient({
  link: splitLink,
  // link: concat(authLink, httpLink as any) as any,
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: "no-cache",
    },
    watchQuery: {
      fetchPolicy: "no-cache",
      nextFetchPolicy: "no-cache",
    },
  },
})

export default client
