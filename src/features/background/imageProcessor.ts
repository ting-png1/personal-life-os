import { MAX_BACKGROUND_DATA_URL_LENGTH } from './backgroundSettings.ts'

const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024

export class BackgroundImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackgroundImageError'
  }
}

export function validateBackgroundImageFile(file: Pick<File, 'type' | 'size'>): void {
  if (!file.type.startsWith('image/')) {
    throw new BackgroundImageError('请选择图片文件')
  }
  if (file.size <= 0 || file.size > MAX_SOURCE_FILE_BYTES) {
    throw new BackgroundImageError('图片需小于 25 MB')
  }
}

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new BackgroundImageError('无法读取这张图片，请换一张重试'))
    image.src = sourceUrl
  })
}

function renderJpeg(image: HTMLImageElement, maxDimension: number, quality: number): string {
  const sourceWidth = image.naturalWidth
  const sourceHeight = image.naturalHeight
  if (!sourceWidth || !sourceHeight) {
    throw new BackgroundImageError('图片尺寸无效')
  }

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new BackgroundImageError('当前设备无法处理图片')

  context.fillStyle = '#ECE8EF'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

/** Compresses a local image before it enters the versioned localStorage boundary. */
export async function prepareCustomBackgroundImage(file: File): Promise<string> {
  validateBackgroundImageFile(file)
  const sourceUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(sourceUrl)
    const attempts = [
      { maxDimension: 1600, quality: 0.82 },
      { maxDimension: 1600, quality: 0.68 },
      { maxDimension: 1280, quality: 0.72 },
      { maxDimension: 1024, quality: 0.68 },
    ] as const

    for (const attempt of attempts) {
      const dataUrl = renderJpeg(image, attempt.maxDimension, attempt.quality)
      if (dataUrl.length <= MAX_BACKGROUND_DATA_URL_LENGTH) return dataUrl
    }

    throw new BackgroundImageError('图片处理后仍然过大，请换一张重试')
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
