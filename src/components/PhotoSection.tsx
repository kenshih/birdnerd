import { useState, useEffect, useRef, useCallback } from 'react'
import type { PhotoRecord } from '../types'
import { getPhotosByRecord, savePhoto, deletePhoto } from '../db'
import { generatePhotoFilename, getFileExtension } from '../utils/photoFilename'
import PhotoReviewModal from './PhotoReviewModal'

export interface PendingPhoto {
  blob: Blob
  bodyPart: string
  fileName: string
}

interface Props {
  recordId?: string
  date: string
  station: string
  speciesCode: string
  bandNumber: string
  recordSequence: number
  onPendingPhotosChange?: (pending: PendingPhoto[]) => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function PhotoSection({ recordId, date, station, speciesCode, bandNumber, recordSequence, onPendingPhotosChange }: Props) {
  const [savedPhotos, setSavedPhotos] = useState<PhotoRecord[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [modalBlob, setModalBlob] = useState<Blob | null>(null)
  const [modalExt, setModalExt] = useState('jpg')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPhotos = useCallback(async () => {
    if (recordId) {
      const photos = await getPhotosByRecord(recordId)
      setSavedPhotos(photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
    }
  }, [recordId])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  useEffect(() => {
    onPendingPhotosChange?.(pendingPhotos)
  }, [pendingPhotos, onPendingPhotosChange])

  const makeFileName = useCallback((bodyPart: string) => {
    return generatePhotoFilename({ date, station, species: speciesCode, bandNumber, recordSequence, bodyPart, ext: modalExt })
  }, [date, station, speciesCode, bandNumber, recordSequence, modalExt])

  function handleFileCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setModalExt(getFileExtension(file))
      setModalBlob(file)
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave(bodyPart: string) {
    if (!modalBlob) return
    const fileName = makeFileName(bodyPart)

    if (recordId) {
      const now = new Date().toISOString()
      await savePhoto({
        id: generateId(),
        bandingRecordId: recordId,
        bodyPart,
        fileName,
        blob: modalBlob,
        createdAt: now,
        updatedAt: now,
      })
      await loadPhotos()
    } else {
      setPendingPhotos(prev => [...prev, { blob: modalBlob!, bodyPart, fileName }])
    }
    setModalBlob(null)
  }

  async function handleDelete(photoId: string) {
    await deletePhoto(photoId)
    await loadPhotos()
  }

  function handleDeletePending(idx: number) {
    setPendingPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  const allPhotos = [
    ...savedPhotos.map(p => ({ type: 'saved' as const, id: p.id, bodyPart: p.bodyPart, fileName: p.fileName })),
    ...pendingPhotos.map((p, i) => ({ type: 'pending' as const, id: `pending-${i}`, bodyPart: p.bodyPart, fileName: p.fileName, idx: i })),
  ]

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileCapture}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={photoBtnStyle}
        >
          Add Photo {allPhotos.length > 0 && <span style={badgeStyle}>{allPhotos.length}</span>}
        </button>
      </div>

      {allPhotos.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          {allPhotos.map(p => (
            <div key={p.id} style={photoRowStyle}>
              <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#2d6a4f', minWidth: 40 }}>
                {p.bodyPart}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.fileName}
              </span>
              {p.type === 'pending' && (
                <span style={{ fontSize: '0.65rem', color: '#e67e22', fontWeight: 600 }}>pending</span>
              )}
              <button
                type="button"
                onClick={() => p.type === 'saved' ? handleDelete(p.id) : handleDeletePending((p as { idx: number }).idx)}
                style={deleteBtnStyle}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {modalBlob && (
        <PhotoReviewModal
          blob={modalBlob}
          defaultBodyPart="WING"
          generateFileName={makeFileName}
          onSave={handleSave}
          onCancel={() => setModalBlob(null)}
        />
      )}
    </div>
  )
}

const photoBtnStyle: React.CSSProperties = {
  background: '#2d6a4f',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.5rem 1rem',
  fontSize: '0.9rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
}

const badgeStyle: React.CSSProperties = {
  background: '#fff',
  color: '#2d6a4f',
  borderRadius: '50%',
  width: 20,
  height: 20,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.7rem',
  fontWeight: 700,
}

const photoRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.3rem 0.5rem',
  background: '#f8f9fa',
  borderRadius: 4,
  marginBottom: '0.25rem',
  fontSize: '0.8rem',
}

const deleteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#c0392b',
  fontSize: '1.1rem',
  cursor: 'pointer',
  padding: '0 0.25rem',
  lineHeight: 1,
}
