// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google, sheets_v4, drive_v3 } from "googleapis";
import { Readable } from "stream";

export const runtime = "nodejs";

const redis = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola-v3";

// *** CORRECCIÓN DEFINITIVA: El orden de columnas ahora coincide 1:1 con tu última imagen de Google Sheet ***
const COLUMN_ORDER: (keyof QueueItem['fields'] | `fotos${'Diagnostico' | 'Solucion' | 'Pruebas'}`)[] = [
  "cliente",                // B
  "direccion",              // C
  "ciudad",                 // D
  "tecnico",                // E
  "fechaVisita",            // F
  "codigoSku",              // G
  "observacionesGenerales",   // H
  "clienteSatisfecho",      // I
  "seEntregoInstructivo",   // J
  "diagnostico",            // K
  "comentariosDiagnostico", // L
  "fotosDiagnostico",       // M (Placeholder para links de fotos)
  "solucion",               // N
  "comentariosSolucion",    // O
  "fotosSolucion",          // P (Placeholder para links de fotos)
  "pruebas",                // Q
  "comentariosPruebas",     // R
  "fotosPruebas",           // S (Placeholder para links de fotos)
  "transcripcionVoz",       // T
];

type UploadedFile = { name: string; url: string; mimeType?: string };
type QueueFields = {
    cliente: string;
    direccion: string;
    ciudad: string;
    tecnico: string;
    fechaVisita: string;
    codigoSku: string;
    observacionesGenerales: string;
    clienteSatisfecho: string;
    seEntregoInstructivo: string;
    diagnostico: string;
    comentariosDiagnostico: string;
    solucion: string;
    comentariosSolucion: string;
    pruebas: string;
    comentariosPruebas: string;
    transcripcionVoz: string;
};
type QueueItem = {
  fields: QueueFields;
  uploads: {
    diagnostico: UploadedFile[];
    solucion: UploadedFile[];
    pruebas: UploadedFile[];
  };
  ts: number;
};

let sheets: sheets_v4.Sheets | undefined;
let drive: drive_v3.Drive | undefined;

function initializeGoogleServices() {
  if (sheets && drive) { return; }
  try {
    const credsJson = process.env.GSHEETS_CREDENTIALS_JSON;
    if (!credsJson) throw new Error("GSHEETS_CREDENTIALS_JSON no está definida.");
    const creds = JSON.parse(credsJson);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
    });
    sheets = google.sheets({ version: "v4", auth });
    drive = google.drive({ version: "v3", auth });
  } catch (error) {
    console.error("Error al inicializar los servicios de Google:", error);
    throw new Error("Fallo en la configuración de credenciales de Google.");
  }
}

async function uploadFilesToDrive(files: UploadedFile[] | undefined, driveFolder: string, driveApi: drive_v3.Drive): Promise<string> {
    if (!files || files.length === 0) return "";
    const links: string[] = [];
    for (const file of files) {
        try {
            const res = await fetch(file.url);
            if (!res.ok) throw new Error(`Error al descargar archivo: ${res.statusText}`);
            const buf = await res.arrayBuffer();
            const created = await driveApi.files.create({
                requestBody: { name: file.name, parents: [driveFolder] },
                media: { mimeType: file.mimeType || "application/octet-stream", body: Readable.from(Buffer.from(buf)) },
                fields: "webViewLink",
            });
            if (created.data.webViewLink) links.push(created.data.webViewLink);
        } catch (uploadError) {
            console.error(`Error al subir el archivo '${file.name}':`, uploadError);
            links.push(`ERROR_SUBIENDO_${file.name}`);
        }
    }
    return links.join(", ");
}

export async function GET() {
  console.log("Iniciando procesamiento de la cola...");
  try { initializeGoogleServices(); } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const sheetId = process.env.SPREADSHEET_ID;
  const driveFolder = process.env.DRIVE_FOLDER_ID;
  const sheetName = process.env.SHEET_NAME || "Sheet1";

  if (!sheetId || !driveFolder || !sheets || !drive) {
    return NextResponse.json({ error: "Configuración de entorno incompleta." }, { status: 500 });
  }

  const rowsToWrite: string[][] = [];
  let processedCount = 0;

  while (true) {
    const item = await redis.rpop<QueueItem>(QUEUE_KEY);

    if (!item) {
      console.log("La cola está vacía. Finalizando.");
      break;
    }

    try {
      console.log(`Procesando item para cliente: ${item.fields?.cliente || 'N/A'}`);
      
      const diagnosticoLinks = await uploadFilesToDrive(item.uploads.diagnostico, driveFolder, drive);
      const solucionLinks = await uploadFilesToDrive(item.uploads.solucion, driveFolder, drive);
      const pruebasLinks = await uploadFilesToDrive(item.uploads.pruebas, driveFolder, drive);

      const rowData = {
        ...item.fields,
        fotosDiagnostico: diagnosticoLinks,
        fotosSolucion: solucionLinks,
        fotosPruebas: pruebasLinks,
      };

      const newRow = [new Date(item.ts).toISOString()];
      COLUMN_ORDER.forEach(key => {
        newRow.push(rowData[key] || "");
      });
      
      rowsToWrite.push(newRow);
      processedCount++;

    } catch (processingError) {
      console.error("Error procesando item (saltando):", processingError, "Item:", item);
      continue;
    }
  }

  if (rowsToWrite.length > 0) {
    console.log(`Escribiendo ${rowsToWrite.length} fila(s) en Google Sheets...`);
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        // *** CORRECCIÓN FINAL: Se pasa solo el nombre de la hoja. `append` encontrará la última fila automáticamente. ***
        range: sheetName,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rowsToWrite },
      });
      console.log("¡Filas escritas en Google Sheets con éxito!");
    } catch (sheetError) {
      console.error("!!! ERROR CRÍTICO al escribir en Google Sheets:", sheetError);
    }
  }

  return NextResponse.json({ processed: processedCount });
}