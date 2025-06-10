// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

export const runtime = "node"; // para aseguranos de usar Node

// 1) Cargamos Redis y env-vars
const redis = Redis.fromEnv();
const sheetId = process.env.SPREADSHEET_ID!;
const driveFolderId = process.env.DRIVE_FOLDER_ID!;
const creds = JSON.parse(process.env.GSHEETS_CREDENTIALS_JSON!);

// 2) Autenticación Google
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
  const rowsToAppend: string[][] = [];

  // 3) Sacamos todo de la cola
  while (true) {
    const raw = await redis.lpop<string>("cola-de-lista-de-verificación");
    if (!raw) break;

    let item: {
      fields: Record<string, string>;
      uploads: { name: string; url: string }[];
      ts: number;
    };
    try {
      item = JSON.parse(raw);
    } catch {
      console.error("Invalid JSON in queue:", raw);
      continue;
    }

    // 4) Subir uploads a Drive y recolectar enlaces
    const driveLinks: string[] = [];
    for (const up of item.uploads) {
      const res = await fetch(up.url);
      const buffer = await res.arrayBuffer();
      const driveFile = await drive.files.create({
        requestBody: {
          name: up.name,
          parents: [driveFolderId],
        },
        media: {
          mimeType: up.name.includes('.') 
            ? undefined 
            : 'application/octet-stream',
          body: Buffer.from(buffer),
        },
        fields: "webViewLink",
      });
      driveLinks.push(driveFile.data.webViewLink || "");
    }

    // 5) Preparamos la fila: fecha ISO + todos los fields + enlaces
    rowsToAppend.push([
      new Date(item.ts).toISOString(),
      ...Object.values(item.fields),
      ...driveLinks,
    ]);
  }

  // 6) Si hay algo, lo escribimos en la hoja
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
