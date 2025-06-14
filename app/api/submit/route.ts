// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";
import type { NextRequest } from 'next/server';

export const config = {
  api: { bodyParser: false },
};

const redis = Redis.fromEnv();
const QUEUE_KEY = "lista-de-verificación-cola-v3";

async function uploadFile(file: File): Promise<{ name: string; url: string; mimeType: string }> {
  const buffer = await file.arrayBuffer();
  
  // *** SOLUCIÓN DE CONCURRENCIA: Añadimos un sufijo aleatorio para evitar colisiones ***
  // El nombre del archivo en el Blob será único, previniendo el error "blob already exists".
  const blob = await put(
    // El nombre del path sigue siendo el mismo para organización
    `tmp/${file.name}`, 
    buffer, 
    { 
      access: 'public',
      addRandomSuffix: true, // <-- Esta es la opción clave
    }
  );
  
  // Guardamos el nombre original del archivo para referencia en Drive y Sheets
  return { name: file.name, url: blob.url, mimeType: file.type };
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const fields: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") {
        fields[k] = v;
      }
    }

    const diagnosticoFiles = form.getAll("diagnosticoFiles").filter((f): f is File => f instanceof File);
    const solucionFiles = form.getAll("solucionFiles").filter((f): f is File => f instanceof File);
    const pruebasFiles = form.getAll("pruebasFiles").filter((f): f is File => f instanceof File);
    
    const uploads = {
      diagnostico: await Promise.all(diagnosticoFiles.map(uploadFile)),
      solucion: await Promise.all(solucionFiles.map(uploadFile)),
      pruebas: await Promise.all(pruebasFiles.map(uploadFile)),
    };

    await redis.lpush(
      QUEUE_KEY,
      JSON.stringify({ fields, uploads, ts: Date.now() })
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("submit error:", msg, err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}