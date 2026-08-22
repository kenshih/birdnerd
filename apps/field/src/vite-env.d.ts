/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Supplied only by Field's local/pilot development launcher. */
  readonly VITE_FIELD_DEVELOPMENT_TARGET?: string
  /** Launcher-derived, disposable local fixture profiles; never a hosted credential. */
  readonly VITE_LOCAL_FIXTURE_AUTH_PROFILES?: string
}

declare const __APP_VERSION__: string
