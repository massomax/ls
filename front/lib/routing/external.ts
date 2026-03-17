import { recordProductClick } from "@/lib/api/products";

export async function openProductExternal(
  productId: string,
  fallbackUrl: string,
): Promise<void> {
  try {
    await recordProductClick(productId);
  } catch {
    // Ignore click errors; we still navigate.
  }

  window.open(fallbackUrl, "_blank", "noopener,noreferrer");
}
