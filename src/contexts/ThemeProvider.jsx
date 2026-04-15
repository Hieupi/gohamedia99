import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function useTheme() {
    return useContext(ThemeContext)
}

const THEME_KEY = 'goha_studio_theme'
const MIGRATION_KEY = 'goha_studio_theme_migrated_premium_v1'

export default function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        // One-time migration: move every existing user onto the new
        // premium dark base. We use the neutral 'premium' token so the old
        // purple `[data-theme="dark"]` overrides do not kick in.
        if (!localStorage.getItem(MIGRATION_KEY)) {
            localStorage.setItem(THEME_KEY, 'premium')
            localStorage.setItem(MIGRATION_KEY, '1')
            return 'premium'
        }
        return localStorage.getItem(THEME_KEY) || 'premium'
    })

    const setTheme = (t) => {
        setThemeState(t)
        localStorage.setItem(THEME_KEY, t)
    }

    useEffect(() => {
        const root = document.documentElement
        const body = document.body
        // Apply to BOTH <html> and <body> — CSS uses `body:not([data-theme])`
        // selectors that must stop matching once a theme is chosen.
        const apply = (mode) => {
            root.setAttribute('data-theme', mode)
            if (body) body.setAttribute('data-theme', mode)
        }

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
