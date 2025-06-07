// app/api/submit/route.ts
import { NextResponse } from "next/server";
import formidable, { Fields, Files } from "formidable";

// 1) Deshabilitamos el bodyParser nativo
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(): Promise<Response> {
  // 2) Parsear form-data sin usar `any`
  const form = formidable({ multiples: true });

  const { fields, files }: { fields: Fields; files: Files } =
    await new Promise((resolve, reject) => {
      form.parse(
        // @ts-ignore: NextRequest no es el tipo que Formidable espera
        (null as any),
        (err, flds, fls) => {
          if (err) return reject(err);
          resolve({ fields: flds, files: fls });
        }
      );
    });

  // 3) Log para verificar que funciona
  console.log("💬 fields:", fields);
  console.log("📎 files:", files);

  return NextResponse.json({ ok: true }, { status: 200 });
}
