import { PSM, createWorker, type RecognizeResult } from 'tesseract.js'
import type { NormalizedRect } from '../types'
import { cropImageToDataUrl } from '../utils/cropImage'

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
    const croppedRowDataUrl = await cropImageToDataUrl(imageUrl, rect)
    await worker.setParameters({
      tessedit_pageseg_mode: preset.psm ?? PSM.SINGLE_LINE,
      ...(preset.whitelist ? { tessedit_char_whitelist: preset.whitelist } : {}),
    })
    return await worker.recognize(croppedRowDataUrl)
  } finally {
    await worker.terminate()
  }
}
