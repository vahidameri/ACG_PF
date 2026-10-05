import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'fa' | 'en'
export type Calendar = 'jalali' | 'gregorian'

/** Bilingual string: [persian, english]. */
export type T2 = readonly [string, string]

// Module-level locale so plain helpers (date/number formatting, labels) can read it
// without threading a hook everywhere. The provider keeps it in sync and re-renders.
export const locale: { lang: Lang; cal: Calendar } = (() => {
  try {
    const lang = (localStorage.getItem('acg.lang') as Lang) || 'fa'
    return { lang, cal: (localStorage.getItem('acg.cal') as Calendar) || (lang === 'fa' ? 'jalali' : 'gregorian') }
  } catch {
    return { lang: 'fa' as Lang, cal: 'jalali' as Calendar }
  }
})()

export const tr = (pair: T2 | string) => (typeof pair === 'string' ? pair : locale.lang === 'fa' ? pair[0] : pair[1])
/** Inline bilingual text: L('پروژه‌ها', 'Projects') */
export const L = (fa: string, en: string) => (locale.lang === 'fa' ? fa : en)
/** Lookup in a bilingual label map. */
export function lbl<K extends string>(map: Record<K, T2>, k: K | string): string {
  const v = (map as Record<string, T2>)[k]
  return v ? tr(v) : String(k ?? '')
}

interface I18n {
  lang: Lang
  cal: Calendar
  dir: 'rtl' | 'ltr'
  setLang: (l: Lang) => void
  setCal: (c: Calendar) => void
  L: typeof L
}

const Ctx = createContext<I18n | null>(null)

function read<T extends string>(k: string, d: T): T {
  try {
    return (localStorage.getItem(k) as T) || d
  } catch {
    return d
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => read('acg.lang', 'fa'))
  const [cal, setCalState] = useState<Calendar>(() => read('acg.cal', lang === 'fa' ? 'jalali' : 'gregorian'))
  locale.lang = lang
  locale.cal = cal
  const dir = lang === 'fa' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    // switching language also switches to that language's natural calendar
    const c: Calendar = l === 'fa' ? 'jalali' : 'gregorian'
    setCalState(c)
    try {
      localStorage.setItem('acg.lang', l)
      localStorage.setItem('acg.cal', c)
    } catch {}
    locale.lang = l
    locale.cal = c
    window.dispatchEvent(new CustomEvent('acg-lang', { detail: l }))
  }, [])
  const setCal = useCallback((c: Calendar) => {
    setCalState(c)
    try {
      localStorage.setItem('acg.cal', c)
    } catch {}
  }, [])

  const value = useMemo(() => ({ lang, cal, dir: dir as 'rtl' | 'ltr', setLang, setCal, L }), [lang, cal, dir, setLang, setCal])
  // key forces a full re-render so every module-level formatter picks up the change
  return (
    <Ctx.Provider value={value}>
      <div key={`${lang}-${cal}`} className="contents">
        {children}
      </div>
    </Ctx.Provider>
  )
}

export function useI18n() {
  const c = useContext(Ctx)
  if (!c) throw new Error('I18nProvider missing')
  return c
}
