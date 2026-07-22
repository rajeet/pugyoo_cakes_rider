import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User, OpsRolePrefix } from '../types'

interface AuthStore {
  user: User | null
  token: string | null
  rolePrefix: OpsRolePrefix | null
  isAuthenticated: boolean
  login: (user: User, token: string, rolePrefix: OpsRolePrefix) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      rolePrefix: null,
      isAuthenticated: false,

      login: (user, token, rolePrefix) => {
        if (!token || token === 'undefined' || token.trim() === '') {
          console.error('Invalid token provided to login:', token)
          return
        }
        set({
          user,
          token,
          rolePrefix,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({
          user: null,
          token: null,
          rolePrefix: null,
          isAuthenticated: false,
        })
      },

      updateUser: (updatedUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        }))
      },

      isAdmin: () => get().user?.user_type === 'superadmin',
    }),
    {
      name: 'hamro-ops-auth',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
)
