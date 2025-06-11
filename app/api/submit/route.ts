// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const config = { api: { bodyParser: false } };
const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    // 1) Campos texto
    const fields: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") fields[k] = v;
    }

    // 2) Subida a Blob
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

    // 3) Empujar a Redis misma clave que en process-queue
    await redis.lpush(
      "cola-de-lista-de-verificación",
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("submit error", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}