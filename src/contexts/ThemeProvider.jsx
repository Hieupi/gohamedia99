import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function useTheme() {
    return useContext(ThemeContext)
}

const THEME_KEY = 'goha_studio_theme'

export default function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        return localStorage.getItem(THEME_KEY) || 'system'
    })

    const setTheme = (t) => {
        setThemeState(t)
        localStorage.setItem(THEME_KEY, t)
    }

    useEffect(() => {
        const root = document.documentElement
        const apply = (mode) => root.setAttribute('data-theme', mode)

        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)')
            apply(mq.matches ? 'dark' : 'light')
            const handler = (e) => apply(e.matches ? 'dark' : 'light')
            mq.addEventListener('change', handler)
            return () => mq.removeEventListener('change', handler)
        } else {
            apply(theme)
        }
    }, [theme])

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}
