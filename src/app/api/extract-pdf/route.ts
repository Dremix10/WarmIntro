import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let pdfBuffer: ArrayBuffer;

    if (contentType.includes("application/json")) {
      // Google Drive link mode
      const { url } = (await request.json()) as { url: string };
      if (!url) {
        return NextResponse.json({ error: "url is required" }, { status: 400 });
      }

      // Extract Google Drive file ID from various URL formats
      const fileId = extractGoogleDriveFileId(url);
      if (!fileId) {
        return NextResponse.json({ error: "Invalid Google Drive URL. Use the sharing link." }, { status: 400 });
      }

      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const res = await fetch(downloadUrl, { redirect: "follow" });
      if (!res.ok) {
        return NextResponse.json({ error: "Could not download file. Make sure sharing is set to 'Anyone with the link'." }, { status: 400 });
      }
      pdfBuffer = await res.arrayBuffer();
    } else {
      // Direct file upload mode (multipart)
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
      }
      pdfBuffer = await file.arrayBuffer();
    }

    // Server-side PDF text extraction using pdf.js
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

function extractGoogleDriveFileId(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];

  // https://drive.google.com/open?id=FILE_ID
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];

  // https://docs.google.com/document/d/FILE_ID
  const match3 = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match3) return match3[1];

  return null;
}
