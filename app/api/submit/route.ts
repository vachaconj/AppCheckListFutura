// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const config = { api: { bodyParser: false } };
const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    // 1) Parse multipart/form-data
    const formData = await request.formData();

    // 2) Extraer campos de texto
    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }

    // 3) Subir archivos a Blob
    const uploads: { name: string; url: string; mimeType?: string }[] = [];
    // Ajusta "files" al name de tus inputs de archivo
    for (const entry of formData.getAll("files")) {
      if (entry instanceof File) {
        const arrayBuffer = await entry.arrayBuffer();
        const blob = await put(
          `tmp/${Date.now()}-${entry.name}`,
          arrayBuffer,
          { access: "public" } // o "private" si prefieres
        );
        uploads.push({ name: entry.name, url: blob.url, mimeType: entry.type });
      }
    }

    // 4) Empujar a la cola en Redis usando JSON válido
    const payload = { fields, uploads, ts: Date.now() };
    await redis.lpush(
      "lista-de-verificación-cola",
      JSON.stringify(payload)
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
