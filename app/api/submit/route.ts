// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const config = { api: { bodyParser: false } };
const redis = Redis.fromEnv();

// Tipo para los archivos que subimos a Blob
type Upload = { name: string; url: string };

export async function POST(request: Request) {
  try {
    // 1) Parseamos el multipart con la Web API
    const formData = await request.formData();

    // 2) Extraemos todos los campos de texto
    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }

    // 3) Subimos cada archivo bajo la clave "files"
    const uploads: Upload[] = [];
    const files = formData.getAll("files");
    for (const entry of files) {
      if (entry instanceof File) {
        const buffer = await entry.arrayBuffer();
        const blob = await put(
          `tmp/${Date.now()}-${entry.name}`,
          buffer,
          { access: "public" } // o "private" si lo prefieres
        );
        uploads.push({ name: entry.name, url: blob.url });
      }
    }

    // 4) Pusheamos a la misma lista que procesa el consumidor
    await redis.lpush(
      "cola-de-lista-de-verificación",
      JSON.stringify({
        fields,
        uploads,
        ts: Date.now(),
      })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("submit error", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
