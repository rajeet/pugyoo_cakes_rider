/**
 * Toast notification utility for showing top-down popup messages
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

class ToastManager {
  private toasts: Toast[] = []
  private listeners: Array<(toasts: Toast[]) => void> = []
  private toastIdCounter = 0

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]))
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000) {
    const id = `toast-${++this.toastIdCounter}`
    const toast: Toast = { id, message, type, duration }

    this.toasts.push(toast)
    this.notify()

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id)
      }, duration)
    }

    return id
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id)
    this.notify()
  }

  clear() {
    this.toasts = []
    this.notify()
  }

  getToasts(): Toast[] {
    return [...this.toasts]
  }
}

export const toastManager = new ToastManager()

// Convenience functions
export const showSuccess = (message: string, duration?: number) => {
  return toastManager.show(message, 'success', duration)
}

export const showError = (message: string, duration?: number) => {
  return toastManager.show(message, 'error', duration || 4000)
}

export const showInfo = (message: string, duration?: number) => {
  return toastManager.show(message, 'info', duration)
}

export const showWarning = (message: string, duration?: number) => {
  return toastManager.show(message, 'warning', duration)
}

