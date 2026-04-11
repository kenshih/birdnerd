import { useEffect, useMemo, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export default function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [zoom, setZoom] = useState<typeof ZOOM_LEVELS[number]>(1)

  const imageUrl = useMemo(() => {
    if (!selectedFile) return null
    return URL.createObjectURL(selectedFile)
  }, [selectedFile])

  useEffect(() => {
    if (!imageUrl) return

    return () => {
      URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setZoom(1)
  }

  const clearSheet = () => {
    setSelectedFile(null)
    setZoom(1)
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-header">
          <div>
            <p className="eyebrow">BirdNerd OCR 0.2.0</p>
            <h1>Review Skeleton</h1>
            <p className="lede">
              Start with a full-sheet review workflow: upload a bandsheet image,
              inspect the page, and build toward row-by-row transcription from a
              stable visual foundation.
            </p>
          </div>

          <div className="meta">
            <span>Version {__APP_VERSION__}</span>
            <a href="/birdnerd/" className="link">Open field app</a>
          </div>
        </div>

        <section className="toolbar card">
          <div className="toolbar-copy">
            <h2>Sheet Intake</h2>
            <p>
              Upload one photo or scan of the supported bandsheet layout. This
              first slice focuses on reliable image intake and full-sheet viewing;
              row tools come next.
            </p>
          </div>

          <div className="toolbar-actions">
            <label className="button primary">
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {selectedFile ? 'Replace sheet image' : 'Upload sheet image'}
            </label>

            <button
              className="button secondary"
              type="button"
              onClick={clearSheet}
              disabled={!selectedFile}
            >
              Clear
            </button>
          </div>
        </section>

        <section className="workspace">
          <article className="viewer card viewer-card">
            <div className="viewer-topbar">
              <div>
                <h2>Full Sheet Viewer</h2>
                <p>
                  {selectedFile
                    ? `Loaded: ${selectedFile.name}`
                    : 'No sheet loaded yet.'}
                </p>
              </div>

              <div className="zoom-controls">
                <label htmlFor="zoom-level">Zoom</label>
                <select
                  id="zoom-level"
                  value={String(zoom)}
                  onChange={(event) => setZoom(Number(event.target.value) as typeof ZOOM_LEVELS[number])}
                  disabled={!selectedFile}
                >
                  {ZOOM_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {Math.round(level * 100)}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="viewer-surface">
              {imageUrl ? (
                <div className="image-scroll">
                  <img
                    className="sheet-image"
                    src={imageUrl}
                    alt="Uploaded bandsheet"
                    style={{ width: `${zoom * 100}%` }}
                  />
                </div>
              ) : (
                <div className="empty-state">
                  <p>No bandsheet image loaded.</p>
                  <span>Upload a photo or scan to begin the review workflow.</span>
                </div>
              )}
            </div>
          </article>

          <aside className="card side-panel">
            <h2>Current Scope</h2>
            <ul className="scope-list">
              <li>Upload one bandsheet image at a time</li>
              <li>View the full sheet at adjustable zoom</li>
              <li>Replace or clear the current image without leaving the page</li>
            </ul>

            <h2>Next Slice</h2>
            <ul className="scope-list">
              <li>Manual row definition and adjustment</li>
              <li>Selected row crop view</li>
              <li>Next/previous row navigation</li>
            </ul>
          </aside>
        </section>

        {needRefresh && (
          <button className="update" onClick={() => updateServiceWorker(true)}>
            Update OCR app
          </button>
        )}
      </section>
    </main>
  )
}
