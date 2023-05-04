import { useRouter } from "next/router";
import { FC, ReactElement, createContext, useContext, useEffect, useState } from "react";

type BasePathContextProps = string;

export const BasePathContext = createContext<BasePathContextProps>('');

type BasePathProviderProps = {
  publicKey?: string;
  children: ReactElement
}

export const BasePathProvider: FC<BasePathProviderProps> = ({ children }) => {
  const router = useRouter();
  const [basePath, setBasePath] = useState('');

  useEffect(() => {
    if (router.query.publicKey) {
      setBasePath(`/wallet/${router.query.publicKey}`)
    } else {
      setBasePath('');
    }
  }, [router.query.publicKey])

  return <BasePathContext.Provider value={basePath}>
    { children }
  </BasePathContext.Provider>
}

export const useBasePath = () => {
  return useContext(BasePathContext)
}