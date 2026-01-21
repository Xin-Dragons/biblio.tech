import { createConfig, configureChains } from "wagmi";
import { publicProvider } from 'wagmi/providers/public';
// import { PhantomConnector } from 'phantom-wagmi-connector';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'

import { goerli } from "viem/chains";
import { PhantomConnector } from "./phantom-wagmi-connector";

const { publicClient, webSocketPublicClient, chains } = configureChains([goerli], [publicProvider()]) 

export const wagmiConfig = createConfig({
  publicClient,
  webSocketPublicClient,
  connectors: [
    new MetaMaskConnector({ chains }),
    new PhantomConnector({ chains })
  ]
})