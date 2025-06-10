// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();

// Env vars
const SHEET_ID     = process.env.SPREADSHEET_ID!;
const DRIVE_FOLDER = process.env.DRIVE_FOLDER_ID!;
const credsJson    = process.env.GSHEETS_CREDENTIALS_JSON!;

// Configuración Google
const creds = JSON.parse(credsJson) as Record<string, unknown>;
const auth  = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ],
});
const sheets = google.sheets({ version: "v4", auth });
const drive  = google.drive({ version: "v3", auth });

// Tipo del ítem en cola
interface QueueItem {
  fields: Record<string, string>;
  uploads: Array<{ name: string; url: string; mimeType: string }>;
  ts: number;
}

export async function GET() {
  const rows: string[][] = [];
  const KEY = "cola-de-lista-de-verificación";

  // 1) Extraemos hasta vaciar
  while (true) {
    const raw = await redis.lpop<string>(KEY);
    if (!raw) break;

    let item: QueueItem;
    try {
      item = JSON.parse(raw) as QueueItem;
    } catch {
      console.warn("Invalid JSON, skipping:", raw);
      continue;
    }

    // 2) Subir archivos a Drive
    const links: string[] = [];
    for (const up of item.uploads) {
      const res    = await fetch(up.url);
      const buffer = await res.arrayBuffer();
      const file   = await drive.files.create({
        requestBody: { name: up.name, parents: [DRIVE_FOLDER] },
        media:       { mimeType: up.mimeType, body: Buffer.from(buffer) },
        fields:      "webViewLink",
      });
      if (file.data.webViewLink) {
        links.push(file.data.webViewLink);
      }
    }

    // 3) Construir fila con timestamp, campos y enlaces
    rows.push([
      new Date(item.ts).toISOString(),
      ...Object.values(item.fields),
      ...links,
    ]);
  }

  // 4) Enviar a Google Sheets si hay filas
  if (rows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId:   SHEET_ID,
      range:           "Sheet1!A:Z",
      valueInputOption:"RAW",
      requestBody:     { values: rows },
    });
  }

  return NextResponse.json({ processed: rows.length });
}