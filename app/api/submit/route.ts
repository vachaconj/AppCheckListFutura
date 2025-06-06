// app/api/submit/route.ts
export const runtime = "nodejs";   // ← fuerza a usar Serverless-Node
import { NextRequest, NextResponse } from "next/server";

import formidable, { File } from "formidable";
import * as fs from "fs/promises";

import { put } from "@vercel/blob";          // ← sube archivos a Vercel Blob
import { Redis } from "@upstash/redis";      // ← cola simple basada en Redis

import type { IncomingMessage } from "http"; // para tipar la función de parseo

/* -------------------------------------------------------------------------- */
/*  1.  Desactivar el body-parser nativo:                                     */
/* -------------------------------------------------------------------------- */
export const config = {
  api: { bodyParser: false },
};

/* -------------------------------------------------------------------------- */
/*  2.  Cliente Redis (URL y TOKEN llegan de las env vars que creó Upstash)   */
/* -------------------------------------------------------------------------- */
const redis = Redis.fromEnv();

/* -------------------------------------------------------------------------- */
/*  3.  Helper: parsear multipart/form-data con formidable                    */
/* -------------------------------------------------------------------------- */
function parseMultipart(
  req: IncomingMessage,
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({ multiples: true });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

/* -------------------------------------------------------------------------- */
/*  4.  End-point POST                                                        */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    /* 4.1 Desmontar campos y archivos ------------------------------------- */
    // NextRequest.body es un ReadableStream; formidable espera IncomingMessage
    const { fields, files } = await parseMultipart(
      req.body as unknown as IncomingMessage,
    );

    /* 4.2 Subir cada archivo a Blob --------------------------------------- */
    const uploads: { name: string; url: string }[] = [];

    for (const key of Object.keys(files)) {
      const entry = files[key];
      // Formidable puede devolver File | File[]
      const file: File | undefined = Array.isArray(entry) ? entry[0] : entry;
      if (!file) continue;

      const data = await fs.readFile(file.filepath);

      const blob = await put(
        // Nombre temporal único dentro del bucket
        `tmp/${Date.now()}-${file.originalFilename ?? file.newFilename}`,
        data,
        { access: "public" },    // Desde abril-2025 solo se permite "public"
      );

      uploads.push({ name: file.originalFilename ?? key, url: blob.url });
    }

    /* 4.3 Meter la tarea en la cola Redis --------------------------------- */
    await redis.lpush(
      "checklist-queue",                     // Nombre de la lista
      JSON.stringify({ ts: Date.now(), fields, uploads }),
    );

    /* 4.4 Respuesta al frontend ------------------------------------------- */
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err) {
    console.error("[submit] error:", err);
    return NextResponse.json(
      { ok: false, error: "internal-error" },
      { status: 500 },
    );
  }
}
