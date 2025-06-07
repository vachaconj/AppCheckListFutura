// app/api/submit/route.ts
import { NextResponse } from "next/server";

// 1) Deshabilitamos el bodyParser nativo de Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2) Función que maneja POST /api/submit
//    No usamos el request de momento, así que lo eliminamos de la firma.
export async function POST() {
  // esto llegará a los logs de Vercel
  console.log("✅ /api/submit recibió una llamada");
  return NextResponse.json({ ok: true }, { status: 200 });
}

