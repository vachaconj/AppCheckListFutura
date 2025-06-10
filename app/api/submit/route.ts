// app/api/submit/route.ts

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { google } from "googleapis";

export const config = { api: { bodyParser: false } };

// 1) Leer credenciales y configurar Google Sheets & Drive
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

// 2) ID de tu hoja y carpeta
const SHEET_ID      = process.env.SPREADSHEET_ID!;
const DRIVE_FOLDER  = process.env.DRIVE_FOLDER_ID!;

export async function POST(request: Request) {
  try {
    // 3) Parse multipart/form-data
    const formData = await request.formData();

    // 4) Extraer campos de texto
    const fields: Record<string, string> = {};
    for (const [k, v] of formData.entries()) {
      if (typeof v === "string") fields[k] = v;
    }

    // 5) Subir archivos y recoger sus URLs
    const fileLinks: string[] = [];
    for (const file of formData.getAll("files")) {
      if (!(file instanceof File)) continue;
      const data = await file.arrayBuffer();
      const blob = await put(
        `tmp/${Date.now()}-${file.name}`,
        data,
        { access: "public" }
      );
      // Opcional: mover blob a Drive
      const buf = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
      const uploaded = await drive.files.create({
        requestBody: { name: file.name, parents: [DRIVE_FOLDER] },
        media: { body: buf },
        fields: "webViewLink",
      });
      if (uploaded.data.webViewLink) fileLinks.push(uploaded.data.webViewLink);
    }

    // 6) Montar la fila: timestamp + todos los campos + enlaces
    const row = [
      new Date().toISOString(),
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
      ...fileLinks,
    ];

    // 7) Añadir la fila en Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:Z",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("submit error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
