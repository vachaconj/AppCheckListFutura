// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

// 1) Forzamos Node.js para poder usar Buffer y googleapis
export const runtime = "nodejs";

// 2) Instanciamos Redis usando tus variables de entorno
const redis = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola";

// 3) Configuraciones de Google Sheets & Drive
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
const drive = google.drive({ version: "v3", auth });

// 4) Tipado estricto de la cola
type Upload = { name: string; url: string; mimeType: string };
type QueueItem = {
  fields: Record<string, string>;
  uploads: Upload[];
  ts: number;
};

export async function GET() {
  const rowsToAppend: (string | number)[][] = [];

  // 5) Vaciamos la cola
  while (true) {
    const raw = await redis.lpop<string>(QUEUE_KEY);
    if (!raw) break;

    let item: QueueItem;
    try {
      item = JSON.parse(raw) as QueueItem;
    } catch {
      // JSON inválido, lo saltamos
      continue;
    }

    const { fields, uploads, ts } = item;

    // 6) Subimos ficheros a Drive
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
          mimeType: up.mimeType,
          body: Buffer.from(buffer),
        },
        fields: "webViewLink",
      });
      driveLinks.push(file.data.webViewLink!);
    }

    // 7) Preparamos la fila para Google Sheets
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

  // 8) Si hay filas, las escribimos
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
