// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const config = { api: { bodyParser: false } };
const redis = Redis.fromEnv();

// Tipo de carga
type Upload = { name: string; url: string; mimeType: string };

export async function POST(request: Request) {
  try {
    // 1) Parseamos multipart/form-data
    const formData = await request.formData();

    // 2) Recogemos campos de texto
    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }

    // 3) Subimos archivos a Blob y guardamos URLs
    const uploads: Upload[] = [];
    for (const entry of formData.getAll("files")) {
      if (entry instanceof File) {
        const buffer = await entry.arrayBuffer();
        const blob = await put(
          `tmp/${Date.now()}-${entry.name}`,
          buffer,
          { access: "public" }
        );
        uploads.push({ name: entry.name, url: blob.url, mimeType: entry.type });
      }
    }

    // 4) Encolamos en Redis bajo la misma llave
    const payload = { fields, uploads, ts: Date.now() };
    await redis.lpush(
      "cola-de-lista-de-verificación",
      JSON.stringify(payload)
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("submit error", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
