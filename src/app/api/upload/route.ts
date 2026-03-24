import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("X-Get-Key") === "1") {
      const apiKey =
        process.env.imgbb_api_key ||
        process.env.IMGBB_API_KEY ||
        process.env.mgbb_api_key ||
        process.env.MGBB_API_KEY;
      if (apiKey) {
        return NextResponse.json({ key: apiKey });
      }
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "Kuvaa ei annettu" }, { status: 400 });
    }

    const apiKey =
      process.env.imgbb_api_key ||
      process.env.IMGBB_API_KEY ||
      process.env.mgbb_api_key ||
      process.env.MGBB_API_KEY;

    if (!apiKey) {
      const envKeys = Object.keys(process.env)
        .filter((k) => k.toLowerCase().includes("imgbb") || k.toLowerCase().includes("mgbb"))
        .join(", ");
      return NextResponse.json(
        {
          error: `API-avain puuttuu. Löydetyt muuttujat: [${envKeys || "ei yhtään"}]. Lisää imgbb_api_key Vercelin ympäristömuuttujiin ja redeploy.`,
        },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");

    const imgbbForm = new FormData();
    imgbbForm.append("key", apiKey);
    imgbbForm.append("image", base64);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: imgbbForm,
    });

    const result = await response.json();

    if (!result.success) {
      const errMsg = result.error?.message || "ImgBB upload failed";
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    return NextResponse.json({
      url: result.data.url,
      display_url: result.data.display_url,
      thumb_url: result.data.thumb?.url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Tuntematon virhe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
