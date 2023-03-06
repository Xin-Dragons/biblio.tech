import { ThemeProvider as BaseThemeProvider, createTheme } from "@mui/material";
import { createContext, useContext, useEffect, useState } from "react";
import { useTags } from "./tags";
import { merge } from "lodash";

export const ThemeContext = createContext();

const baseTheme = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#6cbec9'
    },
    text: {
      primary: "#faf7f2"
    }
  },
  typography: {
    fontFamily: [
      "Barmeno"
    ].join(','),
  },
}

const { palette } = createTheme();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(createTheme(baseTheme));
  const { tags } = useTags();

  useEffect(() => {
    const colors = tags.filter(t => t.color).reduce((all, item) => {
      return {
        ...all,
        [item.id]: palette.augmentColor({ color: {
          main: item.color
        }})
      }
    }, {})
    const theme = createTheme(merge({}, baseTheme, { palette: colors }))

    setTheme(theme)
  }, [tags])

  return <ThemeContext.Provider value={theme}>
    <BaseThemeProvider theme={theme}>
      { children }
    </BaseThemeProvider>
  </ThemeContext.Provider>
}

export const useTheme = () => {
  return useContext(ThemeContext)
}