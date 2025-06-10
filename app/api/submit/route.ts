// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const config = { api: { bodyParser: false } };
const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    // 1) Parseamos el multipart/form-data
    const formData = await request.formData();

    // 2) Extraemos todos los campos de texto
    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }

    // 3) Subimos cualquier File que venga en el form
    const uploads: { name: string; url: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        const blob = await put(
          `tmp/${Date.now()}-${value.name}`,
          arrayBuffer,
          { access: "public" }
        );
        uploads.push({ name: value.name, url: blob.url });
      }
    }

    // 4) Empujamos a la cola Redis usando la misma key
    await redis.lpush(
      "cola-de-lista-de-verificación",
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("submit error", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
