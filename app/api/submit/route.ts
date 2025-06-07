// app/api/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import formidable, { Fields, Files } from "formidable";
import fs from "fs/promises";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// 1) Deshabilitamos el bodyParser nativo de Next.js
export const config = {
  api: { bodyParser: false },
};

// 2) Creamos cliente Redis leyendo las vars de entorno
const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  try {
    // 3) Parseamos el multipart/form-data con formidable
    const form = formidable({ multiples: true });
    const parseForm = (): Promise<{ fields: Fields; files: Files }> =>
      new Promise((resolve, reject) => {
        form.parse(request as any, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

    const { fields, files } = await parseForm();

    // 4) Subimos cada archivo a Vercel Blob
    const uploads: { name: string; url: string }[] = [];
    for (const key of Object.keys(files)) {
      const fileOrArray = files[key];
      const file = Array.isArray(fileOrArray) ? fileOrArray[0] : fileOrArray;
      if (!file) continue;

      // Leemos el buffer y lo mandamos al blob
      const data = await fs.readFile(file.filepath);
      const blob = await put(
        `tmp/${Date.now()}-${file.originalFilename}`,
        data,
        { access: "public" } // el SDK solo acepta "public"
      );

      uploads.push({
        name: file.originalFilename ?? key,
        url: blob.url,
      });
    }

    // 5) Encolamos la tarea en Redis para procesar después
    await redis.lpush(
      "checklist-queue",
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    // 6) Devolvemos 202 Accepted
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("submit error", error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
