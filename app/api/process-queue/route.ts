// app/api/process-queue/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { google, sheets_v4, drive_v3 } from "googleapis"; // Importar tipos específicos
import { Readable } from "stream";

// 1) Forzar Node.js (para usar googleapis y Buffer/Stream)
export const runtime = "nodejs";

// 2) Instanciamos Redis con la misma clave que el formulario
const redis = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola-v3";

// 3) *** IMPORTANTE: Define el orden EXACTO de tus columnas en Google Sheets ***
// Este array debe coincidir con el nombre de los campos (`name` attribute) en tu formulario.
// ¡El orden aquí es crucial!
const COLUMN_ORDER: string[] = [
  "cliente",
  "direccion",
  "ciudad",
  "tecnico",
  "fecha_visita",
  "codigo_sku",
  "observaciones_generales",
  "cliente_satisfecho",
  "se_entrego_instructivo",
  "diagnostico", // Asumiendo que los checkboxes de diagnóstico se agrupan en un solo campo
  "diagnostico_comentarios",
  "solucion", // Asumiendo que los checkboxes de solución se agrupan
  "solucion_comentarios",
  "pruebas", // Asumiendo que los checkboxes de pruebas se agrupan
  "pruebas_comentarios",
  "transcripcion",
  // No incluyas 'files' aquí, se manejan por separado
];

// 4) Función para inicializar los servicios de Google
// Se han añadido tipos específicos para 'sheets' y 'drive' en lugar de 'any'.
let sheets: sheets_v4.Sheets | undefined;
let drive: drive_v3.Drive | undefined;

function initializeGoogleServices() {
  if (sheets && drive) {
    return;
  }
  try {
    const credsJson = process.env.GSHEETS_CREDENTIALS_JSON;
    if (!credsJson) {
      throw new Error("La variable de entorno GSHEETS_CREDENTIALS_JSON no está definida.");
    }
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
  } catch (error: unknown) { // CORRECCIÓN: Usar 'unknown' en lugar de 'any' en el catch block.
    const message = error instanceof Error ? error.message : "Error desconocido al inicializar servicios.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const sheetId = process.env.SPREADSHEET_ID;
  const driveFolder = process.env.DRIVE_FOLDER_ID;
  const sheetName = process.env.SHEET_NAME || "Sheet1";

  if (!sheetId || !driveFolder || !sheets || !drive) {
    const message = "SPREADSHEET_ID, DRIVE_FOLDER_ID no están definidos, o los servicios de Google no se inicializaron.";
    console.error(message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // CORRECCIÓN: Se ha especificado un tipo más seguro que 'any[][]'.
  const rowsToWrite: string[][] = [];
  let processedCount = 0;

  while (true) {
    const raw = await redis.lpop<string>(QUEUE_KEY);
    if (!raw) {
      console.log("La cola está vacía. Finalizando.");
      break;
    }

    let item: {
      fields: Record<string, string>;
      uploads: { name: string; url: string; mimeType?: string }[];
      ts: number;
    };

    try {
      item = JSON.parse(raw);
      console.log(`Procesando item para cliente: ${item.fields.cliente || 'N/A'}`);

      const driveLinks: string[] = [];
      for (const file of item.uploads) {
        try {
          const res = await fetch(file.url);
          if (!res.ok) throw new Error(`Error al descargar el archivo desde Vercel Blob: ${res.statusText}`);
          const buf = await res.arrayBuffer();
          
          const created = await drive.files.create({
            requestBody: {
              name: file.name,
              parents: [driveFolder],
            },
            media: {
              mimeType: file.mimeType || "application/octet-stream",
              body: Readable.from(Buffer.from(buf)),
            },
            fields: "webViewLink",
          });

          if (created.data.webViewLink) {
             driveLinks.push(created.data.webViewLink);
          }
          console.log(`Archivo subido a Drive: ${file.name}`);
        } catch (uploadError) {
            console.error(`Error al subir el archivo '${file.name}' a Drive:`, uploadError);
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

    } catch (parseError) {
      console.error("Error procesando un item de la cola (saltando item):", parseError, "Item crudo:", raw);
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
      const message = sheetError instanceof Error ? sheetError.message : "Error desconocido al escribir en Sheets."
      return NextResponse.json({ error: "Fallo al escribir en Google Sheets.", details: message }, { status: 500 });
    }
  }

  return NextResponse.json({ processed: processedCount });
}