// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

export const runtime = "nodejs";          // Next.js 13+ exige 'nodejs', no 'node'
const redis = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola";

const sheetId = process.env.SPREADSHEET_ID!;
const creds = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!);

// Autenticación con Google
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ],
});
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

export async function GET() {
  const rowsToAppend: any[][] = [];

  while (true) {
    // 1) Sacamos un elemento de la cola
    const raw = await redis.lpop<string>(QUEUE_KEY);
    if (!raw) break;

    // 2) Parseamos JSON… si falla, lo saltamos
    let item: { fields: any; uploads: any[]; ts: number };
    try {
      item = JSON.parse(raw);
    } catch {
      console.warn("Invalid JSON, skipping:", raw);
      continue;
    }

    const { fields, uploads, ts } = item;

    // 3) Subimos cada upload a Drive y guardamos el enlace
    const driveLinks: string[] = [];
    for (const up of uploads) {
      const res = await fetch(up.url);
      const buffer = await res.arrayBuffer();
      const file = await drive.files.create({
        requestBody: {
          name: up.name,
          parents: process.env.DRIVE_FOLDER_ID
            ? [process.env.DRIVE_FOLDER_ID]
            : [],
        },
        media: {
          mimeType: up.mimeType || "application/octet-stream",
          body: Buffer.from(buffer),
        },
        fields: "webViewLink",
      });
      driveLinks.push(file.data.webViewLink!);
    }

    // 4) Construimos la fila que vamos a añadir a Sheets
    rowsToAppend.push([
      new Date(ts).toISOString(),
      fields.cliente,
      fields.direccion,
      fields.ciudad,
      fields.tecnico,
      fields.fechaVisita,
      fields.codigoSKU,
      fields.observacionesGenerales,
      fields.clienteSatisfecho,
      fields.seEntregoInstructivo,
      fields.comentariosDiagnostico,
      fields.comentariosSolucion,
      fields.comentariosPruebas,
      fields.transcripcionVoz,
      ...driveLinks,
    ]);
  }

  // 5) Si hay filas nuevas, las añadimos de golpe
  if (rowsToAppend.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:Z",
      valueInputOption: "RAW",
      requestBody: { values: rowsToAppend },
    });
  }

  return NextResponse.json({ processed: rowsToAppend.length });
}
