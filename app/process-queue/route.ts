// app/api/process-queue/route.ts
import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { google } from 'googleapis'

// 1) FORZAR EJECUCIÓN EN NODE.JS (para usar googleapis y Buffer)
export const runtime = 'nodejs'

// 2) Instanciar Redis desde las env-vars de Vercel
const redis = Redis.fromEnv()

// 3) Leer tus env-vars
const sheetId       = process.env.SPREADSHEET_ID!
const driveFolderId = process.env.DRIVE_FOLDER_ID!

// 4) Parsear credenciales de Sheets/Drive
const creds = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!)

// 5) Autenticación Google
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ]
})
const sheets = google.sheets({ version: 'v4', auth })
const drive  = google.drive({ version: 'v3', auth })

// 6) Tipado estricto para los items de la cola
type Upload = { name: string; url: string; mimeType?: string }
type Fields = Record<string, string>
type QueueItem = { fields: Fields; uploads: Upload[]; ts: number }

export async function GET() {
  let processed = 0
  const rowsToAppend: string[][] = []

  // 7) Extraer hasta vaciar la cola
  while (true) {
    const raw = await redis.lpop<string>('lista de verificación-cola')
    if (!raw) break

    const { fields, uploads, ts } = JSON.parse(raw) as QueueItem

    // 8) Subir cada archivo a tu carpeta de Drive
    const links: string[] = []
    for (const file of uploads) {
      if (!file.url) continue
      const res = await fetch(file.url)
      const buffer = Buffer.from(await res.arrayBuffer())

      const driveFile = await drive.files.create({
        requestBody: {
          name: file.name,
          parents: [driveFolderId]
        },
        media: {
          mimeType: file.mimeType ?? 'application/octet-stream',
          body: buffer
        },
        fields: 'webViewLink'
      })

      if (driveFile.data.webViewLink) {
        links.push(driveFile.data.webViewLink)
      }
    }

    // 9) Preparar la fila con ISO timestamp + todos tus campos + enlaces
    const row: string[] = [
      new Date(ts).toISOString(),
      ...Object.values(fields),
      links.join(', ')
    ]
    rowsToAppend.push(row)
    processed++
  }

  // 10) Si hay filas, hacer append en la Sheet1
  if (rowsToAppend.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:Z',
      valueInputOption: 'RAW',
      requestBody: { values: rowsToAppend }
    })
  }

  return NextResponse.json({ processed })
}
