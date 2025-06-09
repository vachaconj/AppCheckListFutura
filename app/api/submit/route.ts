// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// 1) Deshabilitamos sólo el bodyParser nativo de Next.js
export const config = { api: { bodyParser: false } };
// (opcional en la 15.3.2 suele funcionar sin)
// export const runtime = "nodejs";

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    // 2) Parse multipart con Web API
    const formData = await request.formData();

    // 3) Extraemos campos de texto
    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") fields[key] = value;
    }

    // 4) Subimos archivos con @vercel/blob
    const uploads: { name: string; url: string }[] = [];
    for (const file of formData.getAll("files")) {
      if (!(file instanceof File)) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const blob = await put(
        `tmp/${Date.now()}-${file.name}`,
        buffer,
        { access: "public" }
      );
      uploads.push({ name: file.name, url: blob.url });
    }

    // 5) Push a la cola Redis
    await redis.lpush(
      "checklist-queue",
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err: any) {
    console.error("submit error", err);
    return NextResponse.json(
      { ok: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
