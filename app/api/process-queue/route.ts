// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

export const runtime = 'nodejs'; // forza ejecución en Node
const redis = Redis.fromEnv();

// Tus env-vars obligatorias
const sheetId = process.env.SPREADSHEET_ID!;
const driveFolderId = process.env.DRIVE_FOLDER_ID!;

// Parseamos JSON de credenciales de Google
const credsJson = process.env.GSHEETS_CREDENTIALS_JSON!;
const creds = JSON.parse(credsJson) as Record<string, unknown>;

// Inicializamos cliente Google
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ],
});
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

// Tipos para el ítem de la cola
type Upload       = { name: string; url: string; mimeType?: string };
type QueueItem    = { fields: Record<string,string>; uploads: Upload[]; ts: number };

export async function GET() {
  // 👉 Cambio clave aquí también
  const queueKey = "cola-de-lista-de-verificación";

  // Preparamos filas a enviar
  const rows: string[][] = [];

  while (true) {
    const raw = await redis.lpop<string>(queueKey);
    if (!raw) break;

    // 🚫 No usamos `any`, casteamos a nuestro tipo
    const item = JSON.parse(raw) as QueueItem;
    const { fields, uploads, ts } = item;

    // 1) Subir cada archivo de `uploads` a Drive
    const links: string[] = [];
    for (const up of uploads) {
      const res = await fetch(up.url);
      const arrayBuffer = await res.arrayBuffer();
      const file = await drive.files.create({
        requestBody: {
          name: up.name,
          parents: [driveFolderId],
        },
        media: {
          mimeType: up.mimeType || "application/octet-stream",
          body: Buffer.from(arrayBuffer),
        },
        fields: "webViewLink",
      });
      if (file.data.webViewLink) links.push(file.data.webViewLink);
    }

    // 2) Construimos la fila para Google Sheets (ajusta el orden de campos)
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
      ...links,
    ]);
  }

  // Solo hacemos append si hay filas nuevas
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
