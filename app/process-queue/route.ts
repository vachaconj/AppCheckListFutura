// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google, sheets_v4, drive_v3 } from "googleapis";
import { Readable } from "stream";

export const runtime = "nodejs";

const redis = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola-v3";

const COLUMN_ORDER: string[] = [
  "cliente", "direccion", "ciudad", "tecnico", "fechaVisita",
  "codigoSku", "observacionesGenerales", "clienteSatisfecho",
  "seEntregoInstructivo", "diagnostico", "comentariosDiagnostico",
  "solucion", "comentariosSolucion", "pruebas", "comentariosPruebas",
  "transcripcionVoz",
];

// Definimos el tipo de objeto que esperamos sacar de la cola.
type QueueItem = {
  fields: Record<string, string>;
  uploads: { name: string; url: string; mimeType?: string }[];
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
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });
    sheets = google.sheets({ version: "v4", auth });
    drive = google.drive({ version: "v3", auth });
    console.log("Servicios de Google inicializados correctamente.");
  } catch (error) {
    console.error("Error al inicializar los servicios de Google:", error);
    throw new Error("Fallo en la configuración de credenciales de Google.");
  }
}

export async function GET() {
  console.log("Iniciando procesamiento de la cola...");

  try {
    initializeGoogleServices();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido al inicializar servicios.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const sheetId = process.env.SPREADSHEET_ID;
  const driveFolder = process.env.DRIVE_FOLDER_ID;
  const sheetName = process.env.SHEET_NAME || "Sheet1";

  if (!sheetId || !driveFolder || !sheets || !drive) {
    const message = "Variables de entorno críticas no definidas o servicios de Google no inicializados.";
    console.error(message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const rowsToWrite: string[][] = [];
  let processedCount = 0;

  while (true) {
    // *** SOLUCIÓN DEFINITIVA ***
    // Le pedimos a Redis que nos devuelva un objeto del tipo QueueItem.
    // La librería se encarga del JSON.parse() automáticamente.
    const item = await redis.lpop<QueueItem>(QUEUE_KEY);

    if (!item) {
      console.log("La cola está vacía. Finalizando.");
      break;
    }

    try {
      // Como ya tenemos un objeto, procedemos directamente.
      // El bloque try/catch ahora nos protegerá si el objeto no tiene la forma esperada.
      console.log(`Procesando item para cliente: ${item.fields?.cliente || 'N/A'}`);

      const driveLinks: string[] = [];
      for (const file of item.uploads) {
        try {
          const res = await fetch(file.url);
          if (!res.ok) throw new Error(`Error al descargar archivo: ${res.statusText}`);
          const buf = await res.arrayBuffer();
          const created = await drive.files.create({
            requestBody: { name: file.name, parents: [driveFolder] },
            media: {
              mimeType: file.mimeType || "application/octet-stream",
              body: Readable.from(Buffer.from(buf)),
            },
            fields: "webViewLink",
          });
          if (created.data.webViewLink) {
             driveLinks.push(created.data.webViewLink);
          }
        } catch (uploadError) {
            console.error(`Error al subir el archivo '${file.name}':`, uploadError);
            driveLinks.push(`ERROR_SUBIENDO_${file.name}`);
        }
      }

      const newRow = [new Date(item.ts).toISOString()];
      for (const key of COLUMN_ORDER) {
        newRow.push(item.fields[key] || "");
      }
      newRow.push(driveLinks.join(", "));
      
      rowsToWrite.push(newRow);
      processedCount++;

    } catch (processingError) {
      // Este error ahora solo ocurrirá si el objeto `item` está malformado.
      console.error("Error procesando un item malformado (saltando):", processingError, "Item crudo:", item);
      continue;
    }
  }

  if (rowsToWrite.length > 0) {
    console.log(`Escribiendo ${rowsToWrite.length} fila(s) en Google Sheets...`);
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rowsToWrite },
      });
      console.log("¡Filas escritas en Google Sheets con éxito!");
    } catch (sheetError) {
      console.error("!!! ERROR CRÍTICO al escribir en Google Sheets:", sheetError);
      const message = sheetError instanceof Error ? sheetError.message : "Error desconocido."
      return NextResponse.json({ error: "Fallo al escribir en Google Sheets.", details: message }, { status: 500 });
    }
  }

  return NextResponse.json({ processed: processedCount });
}