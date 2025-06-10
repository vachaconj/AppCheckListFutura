// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis }           from "@upstash/redis";
import { google }          from "googleapis";

export const runtime = "nodejs";
const redis        = Redis.fromEnv();
const sheetId      = process.env.SPREADSHEET_ID!;
const creds        = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!);

// Inicializa Google API
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
  const rowsToAppend: unknown[][] = [];

  while (true) {
    // 1) LPOP de la misma lista
    const raw = await redis.lpop<string>("cola-de-lista-de-verificación");
    if (!raw) break;

    // 2) Si nos llegó un string JSON, parsearlo; si no, usarlo tal cual
    let item: { fields: Record<string, any>; uploads: any[]; ts: number };
    if (typeof raw === "string") {
      try {
        item = JSON.parse(raw);
      } catch (e) {
        console.error("📌 no es JSON válido, saltando:", raw);
        continue;
      }
    } else {
      // esto no debería pasar si siempre stringifyas
      item = raw as any;
    }

    const { fields, uploads, ts } = item;

    // 3) subir archivos a Drive
    const driveLinks: string[] = [];
    for (const up of uploads) {
      // descargamos el blob que subimos antes
      const res    = await fetch(up.url);
      const buffer = await res.arrayBuffer();

      const driveFile = await drive.files.create({
        requestBody: {
          name:    up.name,
          parents: process.env.DRIVE_FOLDER_ID ? [process.env.DRIVE_FOLDER_ID] : [],
        },
        media: {
          mimeType: up.mimeType || "application/octet-stream",
          body:     Buffer.from(buffer),
        },
        fields: "id,webViewLink",
      });
      driveLinks.push(driveFile.data.webViewLink!);
    }

    // 4) montar la fila para Sheets
    rowsToAppend.push([
      new Date(ts).toISOString(),
      fields.cliente,
      fields.direccion,
      /* … resto de campos … */,
      ...driveLinks,
    ]);
  }

  // 5) si hay algo, hacer append
  if (rowsToAppend.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId:  sheetId,
      range:          "Sheet1!A:Z",
      valueInputOption: "RAW",
      requestBody:    { values: rowsToAppend },
    });
  }

  return NextResponse.json({ processed: rowsToAppend.length });
}

