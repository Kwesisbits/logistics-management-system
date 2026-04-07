import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  persistent?: boolean
}

interface UIState {
  sidebarOpen: boolean
  toasts: Toast[]
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  toasts: [],

  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addToast: (type, message) => {
    const id = crypto.randomUUID()
    const persistent = type === 'error'
    set({ toasts: [...get().toasts, { id, type, message, persistent }] })
    if (!persistent) {
      setTimeout(() => get().removeToast(id), 3000)
    }
  },

  removeToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))
