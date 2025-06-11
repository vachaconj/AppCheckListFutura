// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

// 1) Forzar ejecución en Node para poder usar googleapis Buffer
export const runtime = "nodejs";

// 2) Instanciamos Redis desde las env-vars
const redis = Redis.fromEnv();

// 3) Lectura de env vars de Sheets y Drive
const sheetId      = process.env.SPREADSHEET_ID!;
const driveFolder  = process.env.DRIVE_FOLDER_ID!;
const creds        = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!);

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
    const raw = await redis.lpop<string>("cola-de-lista-de-verificación");
    if (!raw) break;
    const item = JSON.parse(raw) as {
      fields: Record<string, string>;
      uploads: { name: string; url: string; mimeType?: string }[];
      ts: number;
    };

    // 6) Subir cada fichero a Drive
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

  // 8) Si hay algo, lo pegamos en la hoja
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

