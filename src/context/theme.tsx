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
  },
  typography: {
    h1: {
      fontFamily: "Barmeno",
    },
    h2: {
      fontFamily: "Barmeno",
    },
    h3: {
      fontFamily: "Barmeno",
    },
    h4: {
      fontFamily: "Barmeno",
    },
    h5: {
      fontFamily: "Barmeno",
    },
    h6: {
      fontFamily: "Lato",
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
  const [theme, setTheme] = useState<Theme>(createTheme(baseTheme as Theme))
  const { tags } = useTags()

  useEffect(() => {
    console.log(tags)
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
    const theme = createTheme(merge({}, baseTheme, { palette: colors }) as Theme)

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
