// Generate PWA icons from SVG source using sharp
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public/icons')

// SVG icon: soft pink rounded square with a white heart
const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE8EE"/>
      <stop offset="100%" stop-color="#FFD1DC"/>
    </linearGradient>
    <linearGradient id="heart" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB6F92"/>
      <stop offset="100%" stop-color="#E85D7E"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <path d="M256 380 C 160 310, 100 260, 100 196 C 100 148, 136 112, 184 112 C 216 112, 244 128, 256 156 C 268 128, 296 112, 328 112 C 376 112, 412 148, 412 196 C 412 260, 352 310, 256 380 Z"
        fill="url(#heart)" transform="translate(0, 8)"/>
</svg>
`.trim()

// Write SVG source
writeFileSync(resolve(outDir, 'icon.svg'), svg(512))
console.log('✓ icon.svg')

// Generate PNGs
const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 512, name: 'icon-512.maskable.png' }, // maskable: full-bleed background
]

for (const { size, name } of sizes) {
  const isMaskable = name.includes('maskable')
  const inputSvg = isMaskable
    ? svg(size).replace('rx="112"', 'rx="0"') // maskable: no rounded corners, full bleed
    : svg(size)
  await sharp(Buffer.from(inputSvg))
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, name))
  console.log(`✓ ${name} (${size}x${size})`)
}

console.log('\nAll icons generated in public/icons/')
