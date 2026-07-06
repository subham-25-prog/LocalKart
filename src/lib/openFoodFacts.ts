/**
 * Shared helpers for looking up products in the Open Food Facts registry,
 * used by the barcode scan (`/api/products/scan/[barcode]`) and barcode
 * lookup (`/api/barcode/lookup`) routes as a fallback when a barcode is not
 * present in the local database.
 */

/** Safely reads a string field from a raw Open Food Facts product record. */
export function readString(product: Record<string, unknown>, key: string): string {
  const value = product[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Fetches a product from Open Food Facts by barcode. Returns the raw product
 * record when found, or `null` when it is missing, the request fails, or the
 * request times out (1500ms). Network errors are swallowed and logged so
 * callers can fall through to their not-found handling.
 */
export async function fetchOpenFoodFactsProduct(
  code: string
): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (resp.ok) {
      const data = (await resp.json()) as { status?: number; product?: Record<string, unknown> };
      if (data.status === 1) {
        return data.product ?? {};
      }
    }
  } catch (apiErr) {
    console.warn('Open Food Facts API error', apiErr);
  }
  return null;
}

/** Maps a raw Open Food Facts product record onto LocalKart's product shape. */
export function mapOpenFoodFactsProduct(code: string, product: Record<string, unknown>) {
  return {
    barcode: code,
    name: readString(product, 'product_name'),
    image: readString(product, 'image_front_url'),
    brand: readString(product, 'brands'),
    category: readString(product, 'categories'),
    description: readString(product, 'generic_name'),
    packaging: readString(product, 'packaging'),
  };
}
