// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const config = { api: { bodyParser: false } };
const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    // 1) Parse multipart con Web API
    const formData = await request.formData();

    // 2) Extraemos campos de texto
    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }

    // 3) Subimos archivos a Blob
    const uploads: { name: string; url: string }[] = [];
    for (const entry of formData.getAll("files")) {
      if (entry instanceof File) {
        const arrayBuffer = await entry.arrayBuffer();
        // @vercel/blob acepta ArrayBuffer directamente
        const blob = await put(
          `tmp/${Date.now()}-${entry.name}`,
          arrayBuffer,
          { access: "public" }
        );
        uploads.push({ name: entry.name, url: blob.url });
      }
    }

    // 4) Push a la cola Redis
    await redis.lpush(
      "checklist-queue",
      JSON.stringify({ fields, uploads, ts: Date.now() })
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
