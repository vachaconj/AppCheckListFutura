// app/api/submit/route.ts

import type { IncomingMessage } from "http";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import formidable, { Fields, Files } from "formidable";
import fs from "fs/promises";
import { Redis } from "@upstash/redis";

// 1) Deshabilitamos el body parser de Next.js para leer form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2) Creamos cliente Redis (Upstash) desde las env vars
const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  try {
    // --- Inicializamos formidable para parsear multipart/form-data ---
    const form = formidable({ multiples: true });

    // --- Parseamos campos y archivos usando una Promise ---
    const { fields, files }: { fields: Fields; files: Files } =
      await new Promise((resolve, reject) => {
        form.parse(
          request as unknown as IncomingMessage,
          (err, flds, fls) => {
            if (err) return reject(err);
            resolve({ fields: flds, files: fls });
          }
        );
      });

    // --- Subimos cada archivo a Vercel Blob y recogemos su URL ---
    const uploads: Array<{ name: string; url: string }> = [];
    for (const key of Object.keys(files)) {
      const fileOrArray = files[key];
      const file = Array.isArray(fileOrArray) ? fileOrArray[0] : fileOrArray;
      if (!file) continue;

      const data = await fs.readFile(file.filepath);
      // Vercel Blob solo acepta access: "public"
      const blob = await put(
        `tmp/${Date.now()}-${file.originalFilename}`,
        data,
        { access: "public" }
      );
      uploads.push({
        name: file.originalFilename ?? key,
        url: blob.url,
      });
    }

    // --- Encolamos la tarea en Redis (Upstash) para procesarla luego ---
    await redis.lpush(
      "checklist-queue",
      JSON.stringify({
        fields,
        uploads,
        timestamp: Date.now(),
      })
    );

    // --- Respondemos OK202 ---
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("submit error", error);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}


