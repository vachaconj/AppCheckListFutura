// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google } from "googleapis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();

const sheetId = process.env.SPREADSHEET_ID!;
const driveFolderId = process.env.DRIVE_FOLDER_ID!;
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
  const rowsToAppend: string[][] = [];

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
      console.warn("Skipping invalid queue entry:", raw);
      continue;
    }

    // Subir archivos a Drive
    const links: string[] = [];
    for (const up of item.uploads) {
      const res = await fetch(up.url);
      const arrayBuffer = await res.arrayBuffer();
      const driveFile = await drive.files.create({
        requestBody: {
          name: up.name,
          parents: [driveFolderId],
        },
        media: {
          body: Buffer.from(arrayBuffer),
        },
        fields: "webViewLink",
      });
      if (driveFile.data.webViewLink) {
        links.push(driveFile.data.webViewLink);
      }
    }

    // Montar fila: timestamp + campos + enlaces
    rowsToAppend.push([
      new Date(item.ts).toISOString(),
      ...Object.values(item.fields),
      ...links,
    ]);
  }

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

