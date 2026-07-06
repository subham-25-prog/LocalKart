/**
 * Shared helpers for the Google Places-backed store discovery routes
 * (`/api/stores` and `/api/stores/[id]`). These map raw Google Places data
 * onto LocalKart's own category/label taxonomy and provide the visual and
 * pricing fallbacks used when synthesizing store records.
 */

/** Decides whether Prisma queries should be attempted for the given db mode. */
export const isPrismaEnabled = (dbMode?: string | null): boolean => {
  if (dbMode === 'mock') return false;
  return typeof process !== 'undefined' && !!process.env.DATABASE_URL;
};

/** Maps Google Places `types` to a LocalKart category key. */
export function mapCategory(types: string[]): string {
  if (types.includes('pharmacy') || types.includes('drugstore') || types.includes('hospital') || types.includes('doctor')) {
    return 'pharmacy';
  }
  if (types.includes('electronics_store') || types.includes('home_goods_store')) {
    return 'electronics';
  }
  if (types.includes('restaurant') || types.includes('cafe') || types.includes('bakery') || types.includes('meal_takeaway')) {
    return 'restaurant';
  }
  if (types.includes('clothing_store') || types.includes('shoe_store') || types.includes('department_store')) {
    return 'clothing';
  }
  if (types.includes('car_repair') || types.includes('locksmith') || types.includes('plumber') || types.includes('electrician')) {
    return 'repair';
  }
  return 'grocery'; // Default fallback
}

/** Maps Google Places `types` to a UI-facing store type label. */
export function mapType(types: string[]): string {
  if (types.includes('pharmacy')) return 'Pharmacy & Wellness';
  if (types.includes('electronics_store')) return 'Electronics Store';
  if (types.includes('restaurant') || types.includes('cafe')) return 'Restaurant & Cafe';
  if (types.includes('clothing_store')) return 'Clothing & Fashion';
  if (types.includes('car_repair') || types.includes('repair')) return 'Repair & Local Services';
  if (types.includes('supermarket')) return 'Supermarket';
  return 'Grocery Store';
}

/** Checks whether a product category string belongs in a given store category. */
export function matchProductCategory(productCategory: string, storeCategory: string | null): boolean {
  if (!storeCategory) return true;
  const prodCat = productCategory.toLowerCase();
  const storeCat = storeCategory.toLowerCase();

  if (storeCat === 'grocery') {
    return prodCat.includes('grocery') || prodCat.includes('dairy') || prodCat.includes('fresh') || prodCat.includes('egg');
  }
  if (storeCat === 'pharmacy') {
    return prodCat.includes('pharmacy') || prodCat.includes('crocin') || prodCat.includes('dairy'); // pharmacies sell basic dairy
  }
  if (storeCat === 'electronics') {
    return prodCat.includes('electronics') || prodCat.includes('charger') || prodCat.includes('headphone');
  }
  return true; // default match
}

/** Returns a random price based on the product ID for realistic variation. */
export function getRandomPrice(productId: string): number {
  if (productId === 'prod-milk') return 30 + Math.floor(Math.random() * 5);
  if (productId === 'prod-rice') return 100 + Math.floor(Math.random() * 20);
  if (productId === 'prod-eggs') return 78 + Math.floor(Math.random() * 10);
  if (productId === 'prod-charger') return 1300 + Math.floor(Math.random() * 200);
  if (productId === 'prod-headphones') return 4100 + Math.floor(Math.random() * 400);
  if (productId === 'prod-crocin') return 55 + Math.floor(Math.random() * 10);
  if (productId === 'prod-banana') return 40 + Math.floor(Math.random() * 15);
  if (productId === 'prod-bread') return 38 + Math.floor(Math.random() * 8);
  return 50;
}

/** Returns a pre-selected matte gradient for premium store banners. */
export function getBannerGradient(index: number): string {
  const gradients = [
    'linear-gradient(135deg, #18181b 0%, #27272a 100%)', // Matte zinc
    'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', // Forest emerald
    'linear-gradient(135deg, #082f49 0%, #0c4a6e 100%)', // Steel ocean
    'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', // Dusk indigo
    'linear-gradient(135deg, #4c0519 0%, #58051b 100%)', // Crimson wine
  ];
  return gradients[index % gradients.length];
}

/** Returns a realistic category-based image fallback. */
export function getCategoryUnsplashImage(category: string): string {
  const images: Record<string, string> = {
    grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
    pharmacy: 'https://images.unsplash.com/photo-1607619056574-7b8d304a3b24?w=200&h=200&fit=crop',
    electronics: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=200&h=200&fit=crop',
    restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
    clothing: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
    repair: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&h=200&fit=crop',
  };
  return images[category] || images.grocery;
}
