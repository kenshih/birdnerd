import type { NormalizedRect } from '../types'

/**
 * Crops a normalized region from an image URL into a PNG data URL.
 * An optional max dimension keeps previews from ballooning into huge bitmaps.
 */
export async function cropImageToDataUrl(
  imageUrl: string,
  rect: NormalizedRect,
  options?: { maxDimension?: number },
): Promise<string> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context is unavailable for image cropping.')
  }

  const cropX = Math.round(rect.x * image.naturalWidth)
  const cropY = Math.round(rect.y * image.naturalHeight)
  const cropWidth = Math.max(1, Math.round(rect.width * image.naturalWidth))
  const cropHeight = Math.max(1, Math.round(rect.height * image.naturalHeight))

  const scale = options?.maxDimension
    ? Math.min(1, options.maxDimension / Math.max(cropWidth, cropHeight))
    : 1

  canvas.width = Math.max(1, Math.round(cropWidth * scale))
  canvas.height = Math.max(1, Math.round(cropHeight * scale))

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return canvas.toDataURL('image/png')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load the selected row image.'))
    image.src = src
  })
}
