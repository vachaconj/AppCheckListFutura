// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// 1) Deshabilitamos el body parser nativo
export const config = { api: { bodyParser: false } };

// 2) Instanciamos Redis
const redis = Redis.fromEnv();

// 3) Clave única de la cola (mismo nombre en ambos endpoints)
const QUEUE_KEY = "lista-de-verificación-cola-v3";

export async function POST(req: Request) {
  try {
    // 4) Parse multipart con Web API
    const form = await req.formData();

    // 5) Extraemos campos de texto
    const fields: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") fields[key] = value;
    }

    // 6) Subimos los archivos a Blob
    const uploads: { name: string; url: string; mimeType?: string }[] = [];
    for (const file of form.getAll("files")) {
      if (file instanceof File) {
        const buf = await file.arrayBuffer();
        const blob = await put(
          `tmp/${Date.now()}-${file.name}`,
          buf,
          { access: "public" }
        );
        uploads.push({ name: file.name, url: blob.url, mimeType: file.type });
      }
    }

    // 7) Empujamos la tarea (string JSON) a Redis
    await redis.lpush(
      QUEUE_KEY,
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("submit error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
