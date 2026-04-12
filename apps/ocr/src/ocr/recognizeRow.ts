import { PSM, createWorker, type RecognizeResult } from 'tesseract.js'
import type { NormalizedRect } from '../types'

export interface RowOcrPreset {
  label: string
  psm?: PSM
  whitelist?: string
}

export const DEFAULT_ROW_OCR_PRESET: RowOcrPreset = {
  label: 'General Row OCR',
  psm: PSM.SINGLE_LINE,
}

export const SPECIES_CODE_OCR_PRESET: RowOcrPreset = {
  label: 'Species Code OCR Test',
  psm: PSM.SINGLE_WORD,
  whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
}

export const BAND_NUMBER_OCR_PRESET: RowOcrPreset = {
  label: 'Band Number OCR Test',
  psm: PSM.SINGLE_WORD,
  whitelist: '0123456789-',
}

/** Runs browser OCR on a normalized row crop and returns the raw recognition result. */
export async function recognizeRow(
  imageUrl: string,
  rect: NormalizedRect,
  preset: RowOcrPreset = DEFAULT_ROW_OCR_PRESET,
): Promise<RecognizeResult> {
  const worker = await createWorker('eng')

  try {
    const croppedRowDataUrl = await getRowCropDataUrl(imageUrl, rect)
    await worker.setParameters({
      tessedit_pageseg_mode: preset.psm ?? PSM.SINGLE_LINE,
      ...(preset.whitelist ? { tessedit_char_whitelist: preset.whitelist } : {}),
    })
    return await worker.recognize(croppedRowDataUrl)
  } finally {
    await worker.terminate()
  }
}

async function getRowCropDataUrl(imageUrl: string, rect: NormalizedRect): Promise<string> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context is unavailable for OCR cropping.')
  }

  const cropX = Math.round(rect.x * image.naturalWidth)
  const cropY = Math.round(rect.y * image.naturalHeight)
  const cropWidth = Math.max(1, Math.round(rect.width * image.naturalWidth))
  const cropHeight = Math.max(1, Math.round(rect.height * image.naturalHeight))

  canvas.width = cropWidth
  canvas.height = cropHeight
  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  )

  return canvas.toDataURL('image/png')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load the selected row image for OCR.'))
    image.src = src
  })
}
