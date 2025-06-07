// app/api/submit/route.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import formidable from "formidable";
import fs from "fs/promises";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// 1) Deshabilitamos el bodyParser nativo de Next.js:
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2) Conectamos con Upstash Redis (lee URL y TOKEN desde tus env vars):
const redis = Redis.fromEnv();

// 3) Función que maneja POST /api/submit
export async function POST(request: NextRequest) {
  try {
    // 3.1) Parsear formulario multipart/form-data
    const form = formidable({ multiples: true });
    const { fields, files } = await new Promise<any>((resolve, reject) =>
      form.parse(request as any, (err, flds, fls) =>
        err ? reject(err) : resolve({ fields: flds, files: fls })
      )
    );

    // 3.2) Subir cada archivo a Vercel Blob y recoger la URL
    const uploads: { name: string; url: string }[] = [];
    for (const key in files) {
      const file = Array.isArray(files[key]) ? files[key][0] : files[key];
      if (!file) continue;
      const data = await fs.readFile(file.filepath);
      // Sólo "public" está permitido por el SDK
      const blob = await put(
        `tmp/${Date.now()}-${file.originalFilename}`,
        data,
        { access: "public" }
      );
      uploads.push({
        name: file.originalFilename || key,
        url: blob.url,
      });
    }

    // 3.3) Encolar el payload en Redis para procesarlo en background
    await redis.lpush(
      "checklist-queue",
      JSON.stringify({
        fields,
        uploads,
        ts: Date.now(),
      })
    );

    // 3.4) Devolver 202 Accepted
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err) {
    console.error("submit error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
