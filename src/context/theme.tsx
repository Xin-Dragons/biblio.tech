import { ThemeProvider as BaseThemeProvider, Theme, createTheme } from "@mui/material"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useTags } from "./tags"
import { merge } from "lodash"

export const ThemeContext = createContext<Theme>(createTheme())

const baseTheme = {
  palette: {
    mode: "dark",
    primary: {
      main: "#6cbec9",
    },
    text: {
      primary: "#faf7f2",
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

const { palette } = createTheme()

type ThemeProviderProps = {
  children: ReactNode
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(createTheme(baseTheme as any))
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
    const theme = createTheme(merge({}, baseTheme, { palette: colors }) as any)

    setTheme(theme)
  }, [tags])

  return (
    <ThemeContext.Provider value={theme}>
      <BaseThemeProvider theme={theme}>{children}</BaseThemeProvider>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  return useContext(ThemeContext)
}
