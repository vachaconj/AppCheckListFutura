// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();

const sheetId = process.env.SPREADSHEET_ID!;
const creds = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!);

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
  const rows: any[][] = [];

  // 1) Vaciar la cola
  while (true) {
    const raw = await redis.lpop<string>("lista-de-verificación-cola");
    if (!raw) break;

    // 2) Parse seguro
    let item: {
      fields: Record<string, string>;
      uploads: { name: string; url: string; mimeType?: string }[];
      ts: number;
    };
    try {
      item = JSON.parse(raw);
    } catch {
      console.warn("Skipping invalid queue entry:", raw);
      continue;
    }

    const { fields, uploads, ts } = item;

    // 3) Subir cada archivo a Drive y recoger enlaces
    const driveLinks: string[] = [];
    for (const up of uploads) {
      const res = await fetch(up.url);
      const buffer = await res.arrayBuffer();
      const driveFile = await drive.files.create({
        requestBody: {
          name: up.name,
          parents: process.env.DRIVE_FOLDER_ID ? [process.env.DRIVE_FOLDER_ID] : [],
        },
        media: {
          mimeType: up.mimeType || "application/octet-stream",
          body: Buffer.from(buffer),
        },
        fields: "id,webViewLink",
      });
      driveLinks.push(driveFile.data.webViewLink!);
    }

    // 4) Preparar fila para Sheets
    rows.push([
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
      fields.diagnostico,
      fields.comentariosDiagnostico,
      fields.solucion,
      fields.comentariosSolucion,
      fields.pruebas,
      fields.comentariosPruebas,
      fields.transcripcionVoz,
      ...driveLinks,
    ]);
  }

  // 5) Si hay filas, anexarlas a la hoja
  if (rows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:Z",
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }

  return NextResponse.json({ processed: rows.length });
}
