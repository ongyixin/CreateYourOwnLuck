/**
 * POST /api/parse-pdf
 *
 * Accepts a multipart form upload with a single "file" field (PDF).
 * Returns the extracted text content as { text: string }.
 */

import { NextResponse } from "next/server";
import { extractText } from "unpdf";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
  }

  const buffer = await file.arrayBuffer();

  let text: string;
  try {
    const result = await extractText(new Uint8Array(buffer), { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n") : (result.text as string);
  } catch {
    return NextResponse.json({ error: "Failed to parse PDF. Make sure it contains selectable text." }, { status: 422 });
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "No text found in PDF. It may be a scanned image — try copying the text manually." },
      { status: 422 }
    );
  }

  return NextResponse.json({ text: text.trim() });
}
