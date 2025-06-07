// app/api/submit/route.ts

/** 
 * Fuerza a que esta función se ejecute bajo Node.js (no Edge)
 */
export const runtime = "nodejs";

/**
 * Deshabilita el body parser de Next.js para poder usar formidable
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

import { NextRequest, NextResponse } from "next/server";
import formidable from "formidable";
import fs from "fs/promises";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// Inicializa Upstash Redis leyendo las ENV vars
const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  try {
    // 1) Prepara formidable para leer multipart
    const form = formidable({ multiples: true });

    // 2) Parsear request en Promise
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      // formidable espera un IncomingMessage, así que casteamos
      form.parse(request as any, (err, flds, fls) =>
        err ? reject(err) : resolve({ fields: flds, files: fls })
      );
    });

    // 3) Subir cada archivo a Vercel Blob
    const uploads: { name: string; url: string }[] = [];
    for (const key in files) {
      const fileOrArray = files[key];
      const file = Array.isArray(fileOrArray) ? fileOrArray[0] : fileOrArray;
      if (!file) continue;

      const buffer = await fs.readFile(file.filepath);
      const blob = await put(
        `tmp/${Date.now()}-${file.originalFilename}`,
        buffer,
        { access: "public" } // único valor permitido
      );
      uploads.push({
        name: file.originalFilename ?? key,
        url: blob.url,
      });
    }

    // 4) Encolar tarea en Redis
    await redis.lpush(
      "checklist-queue",
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    // 5) Respuesta exitosa
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("submit error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
