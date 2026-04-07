// Store (state management layer): global UI state using Zustand.
// ViewModels can use this to control sidebar, theme, dialogs, etc.
import { create } from 'zustand'
import { createContext, useContext } from 'react'

const useUiStoreBase = create((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))

const UiStoreContext = createContext(useUiStoreBase)

export function UiStoreProvider({ children }) {
  return (
    <UiStoreContext.Provider value={useUiStoreBase}>
      {children}
    </UiStoreContext.Provider>
  )
}

export function useUiStore(selector) {
  const store = useContext(UiStoreContext)
  return store(selector)
}

