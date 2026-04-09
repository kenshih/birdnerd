import { useRegisterSW } from 'virtual:pwa-register/react'

export default function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">BirdNerd Product Family</p>
        <h1>BirdNerd OCR</h1>
        <p className="lede">
          A separate PWA workspace for bandsheet scanning, review, and import.
          Phase 21b establishes the deploy path and app shell so OCR features can
          be layered in carefully.
        </p>

        <div className="card-row">
          <article className="card">
            <h2>Status</h2>
            <p>Scaffolded and deployed independently at <code>/birdnerd/ocr/</code>.</p>
          </article>
          <article className="card">
            <h2>Next Up</h2>
            <p>Connect shared domain types, define document intake, and prototype the review flow.</p>
          </article>
        </div>

        <div className="meta">
          <span>Version {__APP_VERSION__}</span>
          <a href="/birdnerd/" className="link">Open field app</a>
        </div>

        {needRefresh && (
          <button className="update" onClick={() => updateServiceWorker(true)}>
            Update OCR app
          </button>
        )}
      </section>
    </main>
  )
}
