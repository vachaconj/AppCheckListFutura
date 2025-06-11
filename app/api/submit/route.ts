// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// 1) Deshabilitamos el body parser de Next
export const config = { api: { bodyParser: false } };

// 2) Redis y nombre único de la cola
const redis     = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola-v3";

export async function POST(request: Request) {
  try {
    // 3) Parse multipart/form-data
    const form = await request.formData();

    // 4) Campos de texto
    const fields: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") fields[k] = v;
    }

    // 5) Subir archivos a Blob
    const uploads: { name: string; url: string; mimeType: string }[] = [];
    for (const file of form.getAll("files")) {
      if (file instanceof File) {
        const buf  = await file.arrayBuffer();
        const blob = await put(
          `tmp/${Date.now()}-${file.name}`,
          buf,
          { access: "public" }
        );
        uploads.push({ name: file.name, url: blob.url, mimeType: file.type });
      }
    }

    // 6) Encolamos en Redis usando la MISMA clave que lee el consumer
    await redis.lpush(
      QUEUE_KEY,
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("submit error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
