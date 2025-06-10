// app/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

// 1) Forzar Node.js (para usar Buffer + googleapis)
export const runtime = "nodejs";

// 2) Instanciar Redis
const redis = Redis.fromEnv();

// 3) Leer env-vars
const sheetId = process.env.SPREADSHEET_ID!;
const driveFolderId = process.env.DRIVE_FOLDER_ID!;

// 4) Credenciales de Google
const creds = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!);

// 5) Auth Google
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
  const rowsToAppend: any[][] = [];

  // 6) LPOP en bucle
  while (true) {
    const raw = await redis.lpop<string>("cola-de-lista-de-verificación");
    if (!raw) break;
    const { fields, uploads, ts } = JSON.parse(raw);

    // 7) Subir archivos a Drive
    const links: string[] = [];
    for (const up of uploads) {
      const res = await fetch(up.url);               // <–– fetch global
      const buf = Buffer.from(await res.arrayBuffer());
      const driveFile = await drive.files.create({
        requestBody: {
          name: up.name,
          parents: [driveFolderId],
        },
        media: {
          mimeType: up.mimeType || "application/octet-stream",
          body: buf,
        },
        fields: "webViewLink",
      });
      links.push(driveFile.data.webViewLink!);
    }

    // 8) Preparar fila para Sheets
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

  // 9) Append a Google Sheets
  if (rowsToAppend.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:Z",
      valueInputOption: "RAW",
      requestBody: { values: rowsToAppend },
    });
  }

  return NextResponse.json({ processed: rowsToAppend.length });
}

