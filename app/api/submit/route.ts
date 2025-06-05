// app/api// app/api/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import formidable from "formidable";
import fs from "fs";

/* ------------------------------------------------------------------ */
/* 0) Helpers para convertir campos                                   */
/* ------------------------------------------------------------------ */
const toStr = (val: any): string =>
  Array.isArray(val) ? (val[0] as string) ?? "" : typeof val === "string" ? val : "";

const toYesNo = (val: any): "Sí" | "No" =>
  val === "on" || val === "Sí" || val === true ? "Sí" : "No";

const toCSV = (val: any): string =>
  Array.isArray(val)
    ? (val as string[]).filter(Boolean).join(", ")
    : typeof val === "string"
    ? val
    : "";

/* ------------------------------------------------------------------ */
/* 1) Deshabilitamos bodyParser nativo (multipart/form-data)           */
/* ------------------------------------------------------------------ */
export const config = {
  api: { bodyParser: false },
};

/* ------------------------------------------------------------------ */
/* 2) Handler POST /api/submit                                         */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    /* ---------- 2.1 Parsear multipart ---------- */
    const form = formidable({ multiples: true });
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(request as any, (err, flds, fls) => {
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
    const credsJson      = process.env.GSHEETS_CREDENTIALS_JSON!;
    const credentials    = JSON.parse(credsJson);
    const spreadsheetId  = process.env.SPREADSHEET_ID!;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    const drive   = google.drive({ version: "v3", auth });
    const sheets  = google.sheets({ version: "v4", auth });

    /* ---------- 5) Subir archivos a Drive y obtener URLs ---------- */
    const uploadFile = async (file: formidable.File): Promise<string> => {
      const stream = fs.createReadStream(file.filepath);
      const created = await drive.files.create({
        requestBody: {
          name: file.originalFilename ?? "sin-nombre",
          mimeType: file.mimetype ?? undefined,
        },
        media: { mimeType: file.mimetype ?? undefined, body: stream },
        fields: "id,webViewLink",
      });
      const fileId = created.data.id!;
      await drive.permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
      });
      return created.data.webViewLink ?? "";
    };

    const gatherUrls = async (f: any): Promise<string> => {
      if (!f) return "";
      const arr = Array.isArray(f) ? f : [f];
      const urls: string[] = [];
      for (const file of arr) {
        const url = await uploadFile(file as formidable.File);
        if (url) urls.push(url);
      }
      return urls.join(", ");
    };

    const fotosDiagnosticoUrls = await gatherUrls(files.diagnosticoFiles);
    const fotosSolucionUrls    = await gatherUrls(files.solucionFiles);
    const fotosPruebasUrls     = await gatherUrls(files.pruebasFiles);

    /* ---------- 6) Construir la fila para Sheets ---------- */
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

    /* ---------- 7) Respuesta OK ---------- */
    return NextResponse.json(
      { message: "Registro guardado correctamente." },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error en /api/submit:", err);
    return NextResponse.json(
      { error: err.message ?? "Error desconocido." },
      { status: 500 },
    );
  }
}
