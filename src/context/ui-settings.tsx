import { useLocalStorage } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { createContext, FC, useContext, useEffect, useState } from "react";

export type LayoutSize = "small" | "medium" | "large";

type UiSettingsContextProps = {
  layoutSize: LayoutSize;
  setLayoutSize: Function;
  showStarred: boolean;
  setShowStarred: Function;
  showInfo: boolean;
  setShowInfo: Function;
}

const initialProps = {
  layoutSize: "medium",
  setLayoutSize: () => {},
  showStarred: false,
  setShowStarred: () => {},
  showInfo: false,
  setShowInfo: () => {},
}

export const UiSettingsContext = createContext<UiSettingsContextProps>(initialProps);

type UiSettingsProviderProps = {
  children: JSX.Element
}

export const UiSettingsProvider: FC<UiSettingsProviderProps> = ({ children }) => {
  const [layoutSize, setLayoutSize] = useLocalStorage<LayoutSize>("layout-size", "medium");
  const [showStarred, setShowStarred] = useState<boolean>(false)
  const [showInfo, setShowInfo] = useState<boolean>(true)
  const [untagged, setUntagged] = useState<boolean>(false)
  const [selectedMenuShowing, setSelectedMenuShowing] = useState<boolean>(false)
  const router = useRouter();

  return (
    <UiSettingsContext.Provider value={{
      layoutSize,
      setLayoutSize,
      showStarred,
      setShowStarred,
      showInfo,
      setShowInfo,
      untagged,
      setUntagged,
      selectedMenuShowing,
      setSelectedMenuShowing
    }}>
      { children }
    </UiSettingsContext.Provider>
  )
}

export const useUiSettings = () => {
  return useContext(UiSettingsContext);
}