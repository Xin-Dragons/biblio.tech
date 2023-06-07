import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloLink, concat } from "apollo-link";
import fetch from "cross-fetch"

const API_KEY = process.env.TENSOR_API_KEY ?? "";

if (!API_KEY) {
  throw new Error("Missing Tensor API key")
}

const authLink = new ApolloLink((operation, forward) => {
  operation.setContext({
    headers: {
      "X-TENSOR-API-KEY": API_KEY
    }
  })
  return forward(operation)
})

const httpLink = new HttpLink({ uri: "https://api.tensor.so/graphql", fetch })

const client = new ApolloClient({
  link: concat(authLink, httpLink as any) as any,
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: "no-cache"
    },
    watchQuery: {
      fetchPolicy: 'no-cache',
      nextFetchPolicy: "no-cache"
    }
  }

})

export default client;