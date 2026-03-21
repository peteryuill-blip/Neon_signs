/**
 * imageGeneration.ts — Image generation using OpenAI DALL-E
 *
 * Replaces the Manus Forge ImageService with OpenAI's images API.
 *
 * Required environment variables:
 *   OPENAI_API_KEY
 *
 * Example usage:
 *   const { url } = await generateImage({ prompt: "A serene landscape" });
 */

import { storagePut } from "../storage";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // Use gpt-image-1 (supports image editing) or dall-e-3 (generation only)
  const isEdit = options.originalImages && options.originalImages.length > 0;

  if (isEdit) {
    // Image editing: use gpt-image-1 edits endpoint
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("prompt", options.prompt);

    // Attach the first original image
    const first = options.originalImages![0];
    if (first.url) {
      const imgRes = await fetch(first.url);
      const imgBuf = await imgRes.arrayBuffer();
      const mimeType = first.mimeType || "image/png";
      formData.append("image[]", new Blob([imgBuf], { type: mimeType }), "image.png");
    } else if (first.b64Json) {
      const buf = Buffer.from(first.b64Json, "base64");
      formData.append("image[]", new Blob([buf], { type: first.mimeType || "image/png" }), "image.png");
    }

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Image edit failed (${response.status}): ${detail}`);
    }

    const result = await response.json() as { data: Array<{ b64_json?: string; url?: string }> };
    const item = result.data[0];

    if (item.b64_json) {
      const buffer = Buffer.from(item.b64_json, "base64");
      const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
      return { url };
    }
    return { url: item.url };
  } else {
    // Image generation: use dall-e-3
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: options.prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Image generation failed (${response.status}): ${detail}`);
    }

    const result = await response.json() as { data: Array<{ b64_json?: string; url?: string }> };
    const item = result.data[0];

    if (item.b64_json) {
      const buffer = Buffer.from(item.b64_json, "base64");
      const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
      return { url };
    }
    return { url: item.url };
  }
}
