// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const config = { api: { bodyParser: false } };
const redis = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola";

export async function POST(request: Request) {
  try {
    // 1) Parse multipart/form-data
    const formData = await request.formData();

    // 2) Extraemos solo los campos de texto
    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }

    // 3) Subimos cada archivo a Blob y guardamos su URL
    const uploads: { name: string; url: string; mimeType: string }[] = [];
    for (const file of formData.getAll("files")) {
      if (file instanceof File) {
        const buffer = await file.arrayBuffer();
        const blob = await put(
          `tmp/${Date.now()}-${file.name}`,
          buffer,
          { access: "public" }
        );
        uploads.push({ name: file.name, url: blob.url, mimeType: file.type });
      }
    }

    // 4) Encolamos un JSON válido bajo la misma key que el consumer usará
    await redis.lpush(
      QUEUE_KEY,
      JSON.stringify({
        fields,
        uploads,
        ts: Date.now(),
      })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("submit error", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
