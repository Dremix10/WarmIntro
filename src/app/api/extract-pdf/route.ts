import { NextResponse } from "next/server";
import { extractText } from "unpdf";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const { text: pages } = await extractText(buffer);
    const text = pages.join("\n\n").trim();

    if (!text) {
      return NextResponse.json({ error: "Could not extract text from this PDF." }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract PDF text";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
