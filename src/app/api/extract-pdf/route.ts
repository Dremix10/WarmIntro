import { NextResponse } from "next/server";

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

    const pdfBuffer = await file.arrayBuffer();
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(text);
    }

    const fullText = pages.join("\n\n").trim();
    if (!fullText) {
      return NextResponse.json({ error: "Could not extract text from this PDF. It might be a scanned image." }, { status: 400 });
    }

    return NextResponse.json({ text: fullText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract PDF text";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
