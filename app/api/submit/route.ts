// app/api/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import formidable, { Fields, Files, File } from "formidable";
import { google } from "googleapis";
import type { IncomingMessage } from "http";
import fs from "fs";

/* ------------------------------------------------------------------ */
/* 0) Utilidades con tipado estricto                                   */
/* ------------------------------------------------------------------ */
const toStr = (val: unknown): string =>
  Array.isArray(val) ? ((val[0] as string) ?? "") : typeof val === "string" ? val : "";

const toYesNo = (val: unknown): "Sí" | "No" =>
  val === "on" || val === "Sí" || val === true ? "Sí" : "No";

const toCSV = (val: unknown): string =>
  Array.isArray(val)
    ? (val as string[]).filter(Boolean).join(", ")
    : typeof val === "string"
    ? val
    : "";

/* ------------------------------------------------------------------ */
/* 1) Desactivar bodyParser nativo para multipart/form-data            */
/* ------------------------------------------------------------------ */
export const config = { api: { bodyParser: false } };

/* ------------------------------------------------------------------ */
/* 2) POST handler                                                     */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    /* ---------- 2.1 Parsear multipart ---------- */
    const form = formidable({ multiples: true });

    const { fields, files } = await new Promise<{
      fields: Fields;
      files: Files;
    }>((resolve, reject) => {
      // formidable espera un IncomingMessage clásico → cast
      form.parse(req as unknown as IncomingMessage, (err, flds, fls) => {
        if (err) return reject(err);
        resolve({ fields: flds, files: fls });
      });
    });

    /* ---------- 3) Convertir campos ---------- */
    const timestamp              = new Date().toISOString();
    const cliente                = toStr(fields.cliente);
    const direccion              = toStr(fields.direccion);
    const ciudad                 = toStr(fields.ciudad);
    const tecnico                = toStr(fields.tecnico);
    const fechaVisita            = toStr(fields.fechaVisita);
    const codigoSKU              = toStr(fields.codigoSKU);
    const observacionesGenerales = toStr(fields.observacionesGenerales);

    const clienteSatisfecho      = toYesNo(fields.clienteSatisfecho);
    const seEntregoInstructivo   = toYesNo(fields.seEntregoInstructivo);

    const diagnostico            = toCSV(fields.diagnostico);
    const comentariosDiagnostico = toStr(fields.comentariosDiagnostico);

    const solucion               = toCSV(fields.solucion);
    const comentariosSolucion    = toStr(fields.comentariosSolucion);

    const pruebas                = toCSV(fields.pruebas);
    const comentariosPruebas     = toStr(fields.comentariosPruebas);

    const transcripcionVoz       = toStr(fields.transcripcionVoz);

    /* ---------- 4) Autenticación Google ---------- */
    const credsJson     = process.env.GSHEETS_CREDENTIALS_JSON!;
    const credentials   = JSON.parse(credsJson);
    const spreadsheetId = process.env.SPREADSHEET_ID!;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    const drive  = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    /* ---------- 5) Subir archivos a Drive y obtener URLs ---------- */
    const upload = async (file: File): Promise<string> => {
      const stream = fs.createReadStream(file.filepath);
      const res = await drive.files.create({
        requestBody: {
          name: file.originalFilename ?? "sin-nombre",
          mimeType: file.mimetype ?? undefined,
        },
        media: { mimeType: file.mimetype ?? undefined, body: stream },
        fields: "id,webViewLink",
      });
      const fileId = res.data.id!;
      await drive.permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
      });
      return res.data.webViewLink ?? "";
    };

    const gather = async (
      fl: File | File[] | undefined
    ): Promise<string> => {
      if (!fl) return "";
      const arr = Array.isArray(fl) ? fl : [fl];
      const urls: string[] = [];
      for (const f of arr) {
        const url = await upload(f);
        urls.push(url);
      }
      return urls.join(", ");
    };

    const fotosDiagnosticoUrls = await gather(files.diagnosticoFiles as File | File[] | undefined);
    const fotosSolucionUrls    = await gather(files.solucionFiles    as File | File[] | undefined);
    const fotosPruebasUrls     = await gather(files.pruebasFiles     as File | File[] | undefined);

    /* ---------- 6) Insertar fila en Google Sheets ---------- */
    const newRow = [
      timestamp, cliente, direccion, ciudad, tecnico, fechaVisita, codigoSKU,
      observacionesGenerales, clienteSatisfecho, seEntregoInstructivo,
      diagnostico, comentariosDiagnostico, fotosDiagnosticoUrls,
      solucion, comentariosSolucion, fotosSolucionUrls,
      pruebas, comentariosPruebas, fotosPruebasUrls, transcripcionVoz,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "bd-atencion-futura!A1:T1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("Error en /api/submit:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}
