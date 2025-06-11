// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

// 1) Forzar Node (para usar googleapis + Buffer)
export const runtime = "nodejs";

// 2) Instanciamos Redis con la misma clave
const redis = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola-v3";

// 3) Leemos las env-vars de Sheets y Drive
const sheetId     = process.env.SPREADSHEET_ID!;
const driveFolder = process.env.DRIVE_FOLDER_ID!;
const creds       = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!);

// 4) Autenticación Google
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ],
});
const sheets = google.sheets({ version: "v4", auth });
const drive  = google.drive({ version: "v3", auth });

export async function GET() {
  const rows: unknown[][] = [];

  // 5) Vaciamos la cola
  while (true) {
    const raw = await redis.lpop<string>(QUEUE_KEY);
    if (!raw) break;

    let item: {
      fields: Record<string, string>;
      uploads: { name: string; url: string; mimeType?: string }[];
      ts: number;
    };
    try {
      item = JSON.parse(raw);
    } catch {
      console.warn("Skipping bad JSON:", raw);
      continue;
    }

    // 6) Subimos cada fichero a Drive y guardamos su link
    const links: string[] = [];
    for (const file of item.uploads) {
      const res = await fetch(file.url);
      const buf = await res.arrayBuffer();
      const created = await drive.files.create({
        requestBody: {
          name: file.name,
          parents: [driveFolder],
        },
        media: {
          mimeType: file.mimeType || "application/octet-stream",
          body: Buffer.from(buf),
        },
        fields: "webViewLink",
      });
      links.push(created.data.webViewLink!);
    }

    // 7) Preparamos la fila para Sheets
    rows.push([
      new Date(item.ts).toISOString(),
      ...Object.values(item.fields),
      ...links,
    ]);
  }

  // 8) Si hay filas, las escribimos
  if (rows.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:Z",
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }

  return NextResponse.json({ processed: rows.length });
}