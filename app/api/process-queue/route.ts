// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

// 1) Ejecutar en Node.js para poder usar googleapis y Buffer
export const runtime = "nodejs";

// 2) Instanciar Redis desde las env-vars
const redis = Redis.fromEnv();

// 3) Leer las env-vars de Sheets/Drive
const sheetId = process.env.SPREADSHEET_ID!;
const driveFolderId = process.env.DRIVE_FOLDER_ID!;
const creds = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!);

// 4) Autenticación de Google
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
  // ────────────────────────────────────────────────────────────
  // ── Aquí está el any que te quejaba ESLint, lo silenciamos ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowsToAppend: any[][] = [];
  // ────────────────────────────────────────────────────────────

  // 5) Sacar todos los items de la cola
  while (true) {
    const raw = await redis.lpop<string>("cola-de-lista-de-verificación");
    if (!raw) break;

    const item = JSON.parse(raw) as {
      fields: Record<string, string>;
      uploads: Array<{ name: string; url: string; mimeType?: string }>;
      ts: number;
    };

    // 6) Para cada archivo: descargar & subir a Drive
    const driveLinks: string[] = [];
    for (const file of item.uploads) {
      const res = await fetch(file.url);
      const buffer = await res.arrayBuffer();

      const driveFile = await drive.files.create({
        requestBody: {
          name: file.name,
          parents: [driveFolderId],
        },
        media: {
          mimeType: file.mimeType || "application/octet-stream",
          body: Buffer.from(buffer),
        },
        fields: "webViewLink",
      });

      driveLinks.push(driveFile.data.webViewLink!);
    }

    // 7) Armar la fila con campos + enlaces
    rowsToAppend.push([
      new Date(item.ts).toISOString(),
      item.fields.cliente,
      item.fields.direccion,
      item.fields.ciudad,
      item.fields.tecnico,
      item.fields.fechaVisita,
      item.fields.codigoSKU,
      item.fields.observacionesGenerales,
      item.fields.clienteSatisfecho,
      item.fields.seEntregoInstructivo,
      item.fields.diagnostico,
      item.fields.comentariosDiagnostico,
      ...driveLinks,
    ]);
  }

  // 8) Si hay algo, escribirlo en la hoja
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


