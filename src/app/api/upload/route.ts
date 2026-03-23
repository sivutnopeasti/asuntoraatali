import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ImgBB API key not configured" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");

    const imgbbForm = new URLSearchParams();
    imgbbForm.append("key", apiKey);
    imgbbForm.append("image", base64);
    imgbbForm.append("name", image.name.replace(/\.[^.]+$/, ""));

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: imgbbForm,
    });

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: result.data.url,
      display_url: result.data.display_url,
      thumb_url: result.data.thumb?.url,
      delete_url: result.data.delete_url,
    });
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
