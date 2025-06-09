// app/api/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import formidable from "formidable";
import fs from "fs/promises";
import { put, PutCommandOptions } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const config = { api: { bodyParser: false } };

// Inicializa Redis leyendo UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN
const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    // 1) Parsear el formulario multipart
    const form = formidable({ multiples: true });
    // Forzamos a `any` para evitar incompatibilidades TS
    const { fields, files }: { fields: Record<string, any>; files: Record<string, any> } =
      await new Promise((resolve, reject) => {
        form.parse(req as any, (err, flds, fls) =>
          err ? reject(err) : resolve({ fields: flds, files: fls })
        );
      });

    // 2) Subir archivos a Blob
    const uploads: { name: string; url: string }[] = [];
    for (const key of Object.keys(files)) {
      const fileEntry = files[key];
      const file = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
      if (!file) continue;
      const data = await fs.readFile(file.filepath);
      // El SDK de @vercel/blob sólo admite access: "public"
      const options: PutCommandOptions = { access: "public" };
      const blob = await put(`tmp/${Date.now()}-${file.originalFilename}`, data, options);
      uploads.push({ name: file.originalFilename ?? key, url: blob.url });
    }

    // 3) Encolar TODO en Redis como un único JSON string
    const payload = JSON.stringify({ ts: Date.now(), fields, uploads });
    await redis.lpush("checklist-queue", payload);

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err) {
    console.error("Error en /api/submit:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
