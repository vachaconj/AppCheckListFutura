// app/api/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import formidable from "formidable";
import fs from "fs";
import path from "path";

// 1) Deshabilitamos el bodyParser nativo de Next.js para leer multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2) Función que maneja POST /api/submit
export async function POST(request: NextRequest) {
  try {
    // 2.1) Inicializamos formidable para parsear campos y archivos
    const form = formidable({ multiples: true });

    // 2.2) Envolvemos form.parse en una Promise para poder usar await
    const parseForm = (): Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }> => {
      return new Promise((resolve, reject) => {
        form.parse(request as any, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });
    };

    const { fields, files } = await parseForm();

    // ------------------------------------------------------------
    // 3) Extraer cada campo de text o checkbox sin hacer casts directos
    // ------------------------------------------------------------

    // Timestamp
    const timestamp = new Date().toISOString();

    // Campos de texto (si viniera undefined, usamos "")
    const cliente = typeof fields.cliente === "string" ? fields.cliente : "";
    const direccion =
      typeof fields.direccion === "string" ? fields.direccion : "";
    const ciudad = typeof fields.ciudad === "string" ? fields.ciudad : "";
    const tecnico = typeof fields.tecnico === "string" ? fields.tecnico : "";
    const fechaVisita =
      typeof fields.fechaVisita === "string" ? fields.fechaVisita : "";
    const codigoSKU =
      typeof fields.codigoSKU === "string" ? fields.codigoSKU : "";
    const observacionesGenerales =
      typeof fields.observacionesGenerales === "string"
        ? fields.observacionesGenerales
        : "";

    // Checkboxes “Cliente satisfecho” y “Se entregó instructivo”
    // Puede venir “on”, “Sí” u otro string, o bien undefined
    const rawClienteSatisfecho = fields.clienteSatisfecho;
    const rawSeEntregoInstrucciones = fields.seEntregoInstructivo;

    const clienteSatisfecho =
      typeof rawClienteSatisfecho === "string" &&
      (rawClienteSatisfecho === "on" || rawClienteSatisfecho === "Sí")
        ? "Sí"
        : "No";

    const seEntregoInstructivo =
      typeof rawSeEntregoInstrucciones === "string" &&
      (rawSeEntregoInstrucciones === "on" ||
        rawSeEntregoInstrucciones === "Sí")
        ? "Sí"
        : "No";

    // ------------------------------------------------------------
    // Diagnóstico: puede venir como string o string[] o undefined
    // ------------------------------------------------------------
    const rawDiagnostico = fields.diagnostico; // tipo any
    let diagnostico = "";
    if (Array.isArray(rawDiagnostico)) {
      // Si es array (string[])
      // Filtramos únicamente valores de tipo string y ignoramos undefined
      const soloStrings = rawDiagnostico.filter(
        (x): x is string => typeof x === "string"
      );
      diagnostico = soloStrings.join(", ");
    } else if (typeof rawDiagnostico === "string") {
      diagnostico = rawDiagnostico;
    }

    const comentariosDiagnostico =
      typeof fields.comentariosDiagnostico === "string"
        ? fields.comentariosDiagnostico
        : "";

    // ------------------------------------------------------------
    // Solución: string | string[] | undefined
    // ------------------------------------------------------------
    const rawSolucion = fields.solucion;
    let solucion = "";
    if (Array.isArray(rawSolucion)) {
      const soloStrings = rawSolucion.filter(
        (x): x is string => typeof x === "string"
      );
      solucion = soloStrings.join(", ");
    } else if (typeof rawSolucion === "string") {
      solucion = rawSolucion;
    }

    const comentariosSolucion =
      typeof fields.comentariosSolucion === "string"
        ? fields.comentariosSolucion
        : "";

    // ------------------------------------------------------------
    // Pruebas: string | string[] | undefined
    // ------------------------------------------------------------
    const rawPruebas = fields.pruebas;
    let pruebas = "";
    if (Array.isArray(rawPruebas)) {
      const soloStrings = rawPruebas.filter(
        (x): x is string => typeof x === "string"
      );
      pruebas = soloStrings.join(", ");
    } else if (typeof rawPruebas === "string") {
      pruebas = rawPruebas;
    }

    const comentariosPruebas =
      typeof fields.comentariosPruebas === "string"
        ? fields.comentariosPruebas
        : "";

    // ------------------------------------------------------------
    // Transcripción de voz a texto: string | undefined
    // ------------------------------------------------------------
    const transcripcionVoz =
      typeof fields.transcripcionVoz === "string"
        ? fields.transcripcionVoz
        : "";

    // ------------------------------------------------------------
    // 4) Autenticar con Google y subir archivos a Drive
    // ------------------------------------------------------------
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(
        process.cwd(),
        "credentials",
        "gsheets-credentials.json"
      ),
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    const drive = google.drive({ version: "v3", auth });

    // Función auxiliar: sube un archivo a Drive y retorna su webViewLink (URL pública)
    const uploadSingleFile = async (file: formidable.File): Promise<string> => {
      // Lee el stream desde el disco
      const fileStream = fs.createReadStream(file.filepath);

      const created = await drive.files.create({
        requestBody: {
          name: file.originalFilename || "sin-nombre",
          mimeType: file.mimetype || undefined,
        },
        media: {
          mimeType: file.mimetype || undefined,
          body: fileStream,
        },
        fields: "id,webViewLink",
      });

      const fileId = created.data.id!;
      // Otorgar permiso público “anyone with link can read”
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      return created.data.webViewLink || "";
    };

    // 4.1) Subir archivos de Diagnóstico (si existen)
    let fotosDiagnosticoUrls = "";
    if (files.diagnosticoFiles) {
      const diagFiles = Array.isArray(files.diagnosticoFiles)
        ? files.diagnosticoFiles
        : [files.diagnosticoFiles];
      const urls: string[] = [];
      for (const f of diagFiles) {
        // f es de tipo formidable.File
        const url = await uploadSingleFile(f as formidable.File);
        if (url) urls.push(url);
      }
      fotosDiagnosticoUrls = urls.join(", ");
    }

    // 4.2) Subir archivos de Solución (si existen)
    let fotosSolucionUrls = "";
    if (files.solucionFiles) {
      const solFiles = Array.isArray(files.solucionFiles)
        ? files.solucionFiles
        : [files.solucionFiles];
      const urls: string[] = [];
      for (const f of solFiles) {
        const url = await uploadSingleFile(f as formidable.File);
        if (url) urls.push(url);
      }
      fotosSolucionUrls = urls.join(", ");
    }

    // 4.3) Subir archivos de Pruebas (si existen)
    let fotosPruebasUrls = "";
    if (files.pruebasFiles) {
      const pruFiles = Array.isArray(files.pruebasFiles)
        ? files.pruebasFiles
        : [files.pruebasFiles];
      const urls: string[] = [];
      for (const f of pruFiles) {
        const url = await uploadSingleFile(f as formidable.File);
        if (url) urls.push(url);
      }
      fotosPruebasUrls = urls.join(", ");
    }

    // ------------------------------------------------------------
    // 5) Construir la fila con los 20 valores en el orden exacto
    // ------------------------------------------------------------
    const newRow = [
      timestamp,               // A: Timestamp
      cliente,                 // B: Cliente
      direccion,               // C: Dirección
      ciudad,                  // D: Ciudad
      tecnico,                 // E: Técnico
      fechaVisita,             // F: Fecha de visita
      codigoSKU,               // G: Código SKU
      observacionesGenerales,  // H: Observaciones generales
      clienteSatisfecho,       // I: Cliente satisfecho
      seEntregoInstructivo,    // J: Se entregó instructivo
      diagnostico,             // K: Diagnóstico (string con comas)
      comentariosDiagnostico,  // L: Comentarios Diagnóstico
      fotosDiagnosticoUrls,    // M: Fotos y vídeos Diagnóstico (URLs)
      solucion,                // N: Solución
      comentariosSolucion,     // O: Comentarios Solución
      fotosSolucionUrls,       // P: Fotos y vídeos Solución (URLs)
      pruebas,                 // Q: Pruebas
      comentariosPruebas,      // R: Comentarios Pruebas
      fotosPruebasUrls,        // S: Fotos y vídeos Pruebas (URLs)
      transcripcionVoz,        // T: Transcripción de voz a texto
    ];

    // ------------------------------------------------------------
    // 6) Abrir la hoja de cálculo y hacer append
    // ------------------------------------------------------------
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID!;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "bd-atencion-futura!A1:T1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [newRow],
      },
    });

    // ------------------------------------------------------------
    // 7) Si todo salió OK, devolvemos JSON con status 200
    // ------------------------------------------------------------
    return NextResponse.json(
      { message: "Registro guardado correctamente." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error en /api/submit:", error);
    return NextResponse.json(
      { error: error.message || "Error desconocido." },
      { status: 500 }
    );
  }
}
