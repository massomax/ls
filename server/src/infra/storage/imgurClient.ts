import config from "../../shared/config";

export interface UploadedImage {
  id?: string;
  deleteHash?: string;
  url: string;
}

export async function uploadToImgur(
  buffer: Buffer,
  mime: string
): Promise<UploadedImage> {
  const clientId = (config.imgur.clientId || "").trim();

  // Dev fallback: если нет Client ID — просто возвращаем заглушку
  if (!clientId) {
    const fake = `https://dummyimage.com/800x600/cccccc/000000&text=DEV+IMAGE`;
    console.log(
      `[DEV UPLOAD] (no IMGUR_CLIENT_ID) -> return placeholder: ${fake}`
    );
    return { url: fake };
  }

  // Imgur: POST https://api.imgur.com/3/image
  const body = new URLSearchParams();
  body.set("type", "base64");
  body.set("image", buffer.toString("base64"));

  let resp: any;
  try {
    resp = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers: {
        Authorization: `Client-ID ${clientId}`,
        Accept: "application/json",
      },
      body,
    });
  } catch (e) {
    if (config.nodeEnv !== "production") {
      console.warn(
        "[Imgur] network error, DEV fallback used:",
        (e as Error)?.message
      );
      return {
        url: `https://dummyimage.com/800x600/cccccc/000000&text=DEV+IMAGE`,
      };
    }
    throw e;
  }

  const text = await resp.text().catch(() => "");
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }

  if (!resp.ok || (data && data.success === false)) {
    const msg =
      data?.data?.error || data?.data || text || `HTTP ${resp.status}`;
    if (config.nodeEnv !== "production") {
      console.warn(`[Imgur] Error: ${msg} (DEV fallback used)`);
      return {
        url: `https://dummyimage.com/800x600/cccccc/000000&text=DEV+IMAGE`,
      };
    }
    throw new Error(`Imgur error: ${msg}`);
  }

  // Успех
  return {
    id: data?.data?.id,
    deleteHash: data?.data?.deletehash,
    url: data?.data?.link,
  };
}
