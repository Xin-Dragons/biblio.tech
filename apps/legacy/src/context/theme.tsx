import { ThemeProvider as BaseThemeProvider, Theme, createTheme } from "@mui/material"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useTags } from "./tags"
import { merge } from "lodash"
import { useUiSettings } from "./ui-settings"

export const ThemeContext = createContext<Theme>(createTheme())

const getTheme = (mode: "light" | "dark") => {
  return {
    palette: {
      mode,
      primary: {
        main: mode === "light" ? "#226f7d" : "#6cbec9",
      },
      text: {
        main: "black",
        disabled: "#555",
      },
      gold: {
        main: "#faaf00",
      },
    },
    typography: {
      h1: {
        fontFamily: "Lato",
        fontWeight: "bold",
      },
      h2: {
        fontFamily: "Lato",
        fontWeight: "bold",
      },
      h3: {
        fontFamily: "Lato",
        fontWeight: "bold",
      },
      h4: {
        fontFamily: "Lato",
        fontWeight: "bold",
      },
      h5: {
        fontFamily: "Lato",
        fontWeight: "bold",
      },
      h6: {
        fontFamily: "Lato",
        fontWeight: "normal",
      },
      body1: {
        fontFamily: "Lato",
      },
      body2: {
        fontFamily: "Lato",
      },
      button: {
        fontFamily: "Lato",
      },
    },
  }
}

const { palette } = createTheme()

type ThemeProviderProps = {
  children: ReactNode
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const { lightMode } = useUiSettings()
  const [theme, setTheme] = useState<Theme>(createTheme(getTheme("dark") as any))
  const { tags } = useTags()

  useEffect(() => {
    const colors = tags
      .filter((t) => t.color)
      .reduce((all, item) => {
        return {
          ...all,
          [item.id]: palette.augmentColor({
            color: {
              main: item.color as string,
            },
          }),
        }
      }, {})
    const theme = createTheme(merge({}, getTheme(lightMode ? "light" : "dark"), { palette: colors }) as any)

    setTheme(theme)
  }, [tags, lightMode])

  return (
    <ThemeContext.Provider value={theme}>
      <BaseThemeProvider theme={theme}>{children}</BaseThemeProvider>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  return useContext(ThemeContext)
}
