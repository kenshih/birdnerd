import { useEffect, useMemo } from 'react'

/** Creates and cleans up a browser object URL for an uploaded file. */
export function useObjectUrl(file: File | null) {
  const url = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    if (!url) return

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [url])

  return url
}
