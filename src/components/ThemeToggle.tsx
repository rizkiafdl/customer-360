import { MoonIcon, SunIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { applyTheme, readStoredTheme, type Theme } from '@/lib/theme'

/** Switches between the light default and dark (ADR 0009). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => {
        applyTheme(next)
        setTheme(next)
      }}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
