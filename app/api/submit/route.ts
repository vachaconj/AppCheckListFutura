// app/api/submit/route.ts

/**
 * Forzar ejecución en Node.js y deshabilitar el bodyParser
 */
export const runtime = "nodejs";
export const config = {
  api: { bodyParser: false },
};

import type { IncomingMessage } from "http";
import { NextRequest, NextResponse } from "next/server";
import formidable from "formidable";
import fs from "fs/promises";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// Inicializa el cliente Redis leyendo variables de entorno
const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  try {
    // 1) Configura formidable
    const form = formidable({ multiples: true });

    // 2) Parseo en promise tipada
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(
        request as unknown as IncomingMessage,
        (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls }))
      );
    });

    // 3) Subir archivos a Blob
    const uploads: { name: string; url: string }[] = [];
    for (const key in files) {
      const fileOrArr = files[key];
      const file = Array.isArray(fileOrArr) ? fileOrArr[0] : fileOrArr;
      if (!file) continue;

      const buffer = await fs.readFile(file.filepath);
      const blob = await put(
        `tmp/${Date.now()}-${file.originalFilename}`,
        buffer,
        { access: "public" }
      );
      uploads.push({ name: file.originalFilename ?? key, url: blob.url });
    }

    // 4) Encolar en Redis
    await redis.lpush(
      "checklist-queue",
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("submit error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}