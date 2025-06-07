// app/api/submit/route.ts
import { NextRequest, NextResponse } from "next/server";

export const config = { api: { bodyParser: false } };

export async function POST(request: NextRequest) {
  console.log("✅ Llegó un POST /api/submit");  // para que lo veas en logs
  return NextResponse.json({ ok: true });
}
