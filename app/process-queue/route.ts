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

  // *** SOLUCIÓN DEFINITIVA v2: Usar un método más explícito para leer de Redis ***
  // En lugar de LPOP, leemos el último elemento con LRANGE y luego lo eliminamos con LTRIM.
  // Esto evita el comportamiento ambiguo de `lpop` en Vercel.
  while (true) {
    // 1. Leemos el último elemento de la lista (el más antiguo en nuestra cola)
    const results = await redis.lrange<string>(QUEUE_KEY, -1, -1);
    const rawString = results[0];

    if (!rawString) {
      console.log("La cola está vacía. Finalizando.");
      break;
    }

    let item: QueueItem;

    try {
      // 2. Ahora estamos seguros de que `rawString` es un string, procedemos a parsearlo.
      item = JSON.parse(rawString);
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

      // 3. Si todo fue exitoso, eliminamos el elemento que acabamos de procesar de la cola.
      await redis.rpop(QUEUE_KEY); // rpop elimina el último elemento, que es el que leímos.

    } catch (processingError) {
      console.error("Error procesando un item malformado (saltando):", processingError, "Item crudo:", rawString);
      // Si hay un error, eliminamos el item malo para no volver a procesarlo.
      await redis.rpop(QUEUE_KEY);
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