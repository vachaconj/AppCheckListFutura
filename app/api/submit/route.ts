/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import formidable, { Fields, Files } from "formidable";
import fs from "fs/promises";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// 1) Deshabilitar el body parser nativo de Next.js
export const config = { api: { bodyParser: false } };

// 2) Instancia de Redis (lee las vars UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN)
const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  try {
    // 3) Parsear form-data + archivos
    const form = formidable({ multiples: true });
    const { fields, files }: { fields: Fields; files: Files } = await new Promise((resolve, reject) => {
      form.parse(request as any, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    // 4) Subir cada archivo a Blob y guardar sus URLs
    const uploads: { name: string; url: string }[] = [];
    for (const key of Object.keys(files)) {
      const entry = files[key];
      if (!entry) continue;
      const fileEntry = Array.isArray(entry) ? entry[0] : entry;
      const buffer = await fs.readFile(fileEntry.filepath);
      const blob = await put(
        `tmp/${Date.now()}-${fileEntry.originalFilename}`,
        buffer,
        { access: "public" }
      );
      uploads.push({ name: fileEntry.originalFilename ?? key, url: blob.url });
    }

    // 5) Encolar en Redis
    await redis.lpush(
      "checklist-queue",
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    // 6) Responder éxito
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("submit error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
