// app/api/submit/route.ts

// 0) Forzar que esta función corra en Node.js (no Edge)
export const runtime = "nodejs";

// 1) Desactivar el body-parser nativo de Next.js
export const config = {
  api: {
    bodyParser: false
  }
};

import { NextRequest, NextResponse } from "next/server";
import formidable, { File } from "formidable";
import fs from "fs/promises";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// 2) Inicializar cliente Redis desde las env vars inyectadas por Upstash
const redis = Redis.fromEnv();

/**
 * Helper para parsear multipart/form-data con formidable
 */
function parseMultipart(
  req: NextRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({ multiples: true });
  // formidable espera un IncomingMessage, hacemos un cast ligero
  return new Promise((resolve, reject) => {
    form.parse(req as any, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

/**
 * POST /api/submit
 * - parsea campos + archivos
 * - sube cada archivo a Vercel Blob (access: "public")
 * - empuja un mensaje JSON a la lista “checklist-queue” en Upstash Redis
 * - responde 202 Accepted al cliente en <1s
 */
export async function POST(req: NextRequest) {
  try {
    // 3.1) parsear formulario
    const { fields, files } = await parseMultipart(req);

    // 3.2) subir los archivos a Blob y acumular URLs
    const uploads: { name: string; url: string }[] = [];
    for (const key of Object.keys(files)) {
      const entry = files[key];
      const file: File | undefined = Array.isArray(entry) ? entry[0] : entry;
      if (!file) continue;

      const buffer = await fs.readFile(file.filepath);
      const blob = await put(
        `tmp/${Date.now()}-${file.originalFilename ?? file.newFilename}`,
        buffer,
        { access: "public" }
      );
      uploads.push({ name: file.originalFilename ?? key, url: blob.url });
    }

    // 3.3) construir el payload y encolarlo
    const payload = {
      ts: Date.now(),
      fields,
      uploads
    };
    await redis.lpush("checklist-queue", JSON.stringify(payload));

    // 3.4) responder al cliente rápidamente
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err) {
    console.error("[/api/submit] error:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
