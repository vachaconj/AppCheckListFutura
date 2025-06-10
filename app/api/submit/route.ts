// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const config = { api: { bodyParser: false } };
const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    // 1) Parseamos multipart/form-data
    const formData = await request.formData();

    // 2) Extraemos todos los campos de texto
    const fields: Record<string, string> = {};
    for (const [name, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[name] = value;
      }
    }

    // 3) Subimos los archivos (campo "files")
    const uploads: { name: string; url: string }[] = [];
    for (const entry of formData.getAll("files")) {
      if (entry instanceof File) {
        const arrayBuffer = await entry.arrayBuffer();
        const blob = await put(
          `tmp/${Date.now()}-${entry.name}`,
          arrayBuffer,
          { access: "public" }
        );
        uploads.push({ name: entry.name, url: blob.url });
      }
    }

    // 4) Pusheamos JSON válido a Redis
    await redis.lpush(
      "cola-de-lista-de-verificación",
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("submit error", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
