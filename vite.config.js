import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// ─── Thư mục lưu ảnh ─────────────────────────────────────────────────────────
const DOWNLOAD_DIR = 'D:\\00 VIBE CODING\\Goha Studio Donwload'
const KHO_DIR = path.resolve('public/kho')

// ─── Vite plugin: Local file save API ─────────────────────────────────────────
function localFileSavePlugin() {
  return {
    name: 'local-file-save',
    configureServer(server) {
      server.middlewares.use('/__api/save-image', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ success: false, error: 'Method not allowed' }))
          return
        }

        // Read body
        let body = ''
        for await (const chunk of req) body += chunk

        try {
          const { dataUrl, fileName, target } = JSON.parse(body)

          if (!dataUrl || !fileName) {
            res.statusCode = 400
            res.end(JSON.stringify({ success: false, error: 'Missing dataUrl or fileName' }))
            return
          }

          // Pick target directory
          const targetDir = target === 'kho' ? KHO_DIR : DOWNLOAD_DIR

          // Ensure directory exists
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
          }

          // Clean filename — remove invalid chars, keep Vietnamese
          const cleanName = fileName
            .replace(/[<>:"/\\|?*]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()

          // Determine extension from dataUrl
          const mimeMatch = dataUrl.match(/^data:(image\/\w+);base64,/)
          const ext = mimeMatch
            ? (mimeMatch[1] === 'image/jpeg' ? '.jpg' : '.png')
            : '.png'

          // Build full file name with extension
          const finalName = cleanName.endsWith(ext) ? cleanName : `${cleanName}${ext}`
          const filePath = path.join(targetDir, finalName)

          // Convert base64 to buffer and write
          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
          const buffer = Buffer.from(base64Data, 'base64')
          fs.writeFileSync(filePath, buffer)

          const sizeMB = (buffer.length / 1024 / 1024).toFixed(2)
          console.log(`[FileSave] ✅ ${finalName} → ${targetDir} (${sizeMB}MB)`)

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            success: true,
            filePath,
            fileName: finalName,
            sizeMB: parseFloat(sizeMB),
          }))
        } catch (err) {
          console.error('[FileSave] ❌ Error:', err.message)
          res.statusCode = 500
          res.end(JSON.stringify({ success: false, error: err.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localFileSavePlugin()],
})
