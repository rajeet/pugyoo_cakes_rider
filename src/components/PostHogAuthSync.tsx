import React, { useEffect, useRef } from 'react'
import { usePostHog } from 'posthog-react-native'
import { useAuthStore } from '../store/authStore'

const APP = 'pugyoo-mobile-ops'

export default function PostHogAuthSync() {
  const posthog = usePostHog()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const lastId = useRef<string | null>(null)

  useEffect(() => {
    posthog?.register({ app: APP })
  }, [posthog])

  useEffect(() => {
    if (!posthog) return
    if (user && isAuthenticated) {
      const id = String(user.id)
      if (lastId.current === id) return
      lastId.current = id
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
      posthog.identify(id, {
        email: user.email,
        user_type: user.user_type,
        ...(name ? { name } : {}),
      })
    } else {
      if (lastId.current !== null) {
        lastId.current = null
        posthog.reset()
      }
    }
  }, [posthog, user, isAuthenticated])

  return null
}
