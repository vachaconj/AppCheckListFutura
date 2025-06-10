// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put }         from "@vercel/blob";
import { Redis }       from "@upstash/redis";

export const config = { api: { bodyParser: false } };
const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // recoger campos de texto
    const fields: Record<string,string> = {};
    for (const [k,v] of formData.entries()) {
      if (typeof v === "string") fields[k] = v;
    }

    // subir cada archivo
    const uploads: { name:string; url:string; mimeType?:string }[] = [];
    for (const file of formData.getAll("files")) {
      if (file instanceof File) {
        const buffer = await file.arrayBuffer();
        const blob   = await put(
          `tmp/${Date.now()}-${file.name}`,
          buffer,
          { access: "public" }
        );
        uploads.push({ name: file.name, url: blob.url, mimeType: file.type });
      }
    }

    // ** clave EXACTA ** y stringify SIEMPRE
    await redis.lpush(
      "cola-de-lista-de-verificación",
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("submit error", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
