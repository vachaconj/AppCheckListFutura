// app/api/submit/route.ts
import { NextResponse } from "next/server";
import formidable from "formidable";

// Deshabilitamos el bodyParser nativo
export const config = { api: { bodyParser: false } };

export async function POST() {
  // 1) Parsear
  const form = formidable({ multiples: true });
  const { fields, files } = await new Promise<{
    fields: formidable.Fields;
    files: formidable.Files;
  }>((resolve, reject) => {
    form.parse((null as any) /* NextRequest no tipado */, (err, flds, fls) => {
      if (err) return reject(err);
      resolve({ fields: flds, files: fls });
    });
  });

  // 2) Ver en los logs qué llegó
  console.log("💬 fields:", fields);
  console.log("📎 files:", files);

  return NextResponse.json({ ok: true }, { status: 200 });
}