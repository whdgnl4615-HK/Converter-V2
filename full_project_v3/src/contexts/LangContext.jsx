import { createContext, useContext, useState } from 'react'
import { getLang, setLang as persistLang, t } from '../lib/i18n'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(getLang)

  function setLang(l) {
    persistLang(l)
    setLangState(l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, T: t(lang) }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
