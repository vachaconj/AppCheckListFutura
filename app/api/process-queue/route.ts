// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

// 1) Next.js 13+ exige "nodejs" como runtime para usar Buffer y googleapis
export const runtime = "nodejs";

// 2) Instanciamos Redis con tus env-vars
const redis = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola";

// 3) Tus env-vars de Sheets & Drive
const sheetId = process.env.SPREADSHEET_ID!;
const creds = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!);

// 4) Configuración de cliente Google
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ],
});
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

// 5) Tipos claros para lo que hay en tu cola
type Upload = { name: string; url: string; mimeType: string };
type QueueItem = {
  fields: Record<string, string>;
  uploads: Upload[];
  ts: number;
};

// 6) El handler GET que vacía la cola y escribe en Sheet
export async function GET() {
  // Guardia de tipos: fila = lista de celdas string|number
  const rowsToAppend: (string | number)[][] = [];

  while (true) {
    // 6.1) Sacamos un string de Redis
    const raw = await redis.lpop<string>(QUEUE_KEY);
    if (!raw) break;

    // 6.2) Parseamos y validamos
    let item: QueueItem;
    try {
      item = JSON.parse(raw) as QueueItem;
    } catch (err) {
      console.warn("Invalid JSON, skipping:", raw);
      continue;
    }

    const { fields, uploads, ts } = item;

    // 6.3) Subimos cada fichero a Drive
    const links: string[] = [];
    for (const up of uploads) {
      const res = await fetch(up.url);
      const buffer = await res.arrayBuffer();
      const driveFile = await drive.files.create({
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
      links.push(driveFile.data.webViewLink!);
    }

    // 6.4) Construimos la fila con campos + enlaces
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
      ...links,
    ]);
  }

  // 7) Si hay filas, las escribimos todas de golpe
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
