"use client"
import { ThemeProvider as BaseThemeProvider, CssBaseline, Theme, createTheme } from "@mui/material"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { merge } from "lodash"
import { useUiSettings } from "./ui-settings"
import { Lato } from "next/font/google"

const lato = Lato({ weight: ["400", "700"], subsets: ["latin"] })

export const ThemeContext = createContext<Theme>(createTheme())

const getTheme = (mode: "light" | "dark") => {
  return {
    MuiCssBaseline: {
      "a:-webkit-any-link": {
        textDecoration: "none",
      },
    },
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
        // main: "#F8D744",
      },
    },
    typography: {
      h1: {
        fontFamily: lato.style.fontFamily,
        fontWeight: "bold",
      },
      h2: {
        fontFamily: lato.style.fontFamily,
        fontWeight: "bold",
      },
      h3: {
        fontFamily: lato.style.fontFamily,
        fontWeight: "bold",
      },
      h4: {
        fontFamily: lato.style.fontFamily,
        fontWeight: "bold",
      },
      h5: {
        fontFamily: lato.style.fontFamily,
        fontWeight: "bold",
      },
      h6: {
        fontFamily: lato.style.fontFamily,
        fontWeight: "normal",
      },
      body1: {
        fontFamily: lato.style.fontFamily,
      },
      body2: {
        fontFamily: lato.style.fontFamily,
      },
      button: {
        fontFamily: lato.style.fontFamily,
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
  // const { tags } = useTags()

  // useEffect(() => {
  //   const colors = tags
  //     .filter((t: any) => t.color)
  //     .reduce((all: any, item: any) => {
  //       return {
  //         ...all,
  //         [item.id]: palette.augmentColor({
  //           color: {
  //             main: item.color as string,
  //           },
  //         }),
  //       }
  //     }, {})
  //   const theme = createTheme(merge({}, getTheme(lightMode ? "light" : "dark"), { palette: colors }) as any)

  //   setTheme(theme)
  // }, [tags, lightMode])

  return (
    <ThemeContext.Provider value={theme}>
      <BaseThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </BaseThemeProvider>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error("useTheme must be used in a themeProvider")
  }

  return context
}
