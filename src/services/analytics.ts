/**
 * PostHog defaults for baker app (see App.tsx + PostHogProvider).
 */
export const POSTHOG_EU_HOST = 'https://eu.i.posthog.com'

export const posthogMobileOptions = (host: string) => ({
  host: host || POSTHOG_EU_HOST,
  personProfiles: 'identified_only' as const,
  enableSessionReplay: false,
  captureAppLifecycleEvents: true,
})
