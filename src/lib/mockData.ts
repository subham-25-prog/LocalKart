export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  brand: string;
}

export interface Store {
  id: string;
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsapp?: string;
  rating: number;
  reviewsCount: number;
  logo: string;
  banner: string;
  openTime: string;
  closeTime: string;
  verified: boolean;
}

export interface StoreProduct {
  id: string;
  storeId: string;
  productId: string;
  price: number;
  stockCount: number;
  isAvailable: boolean;
}

export interface Review {
  id: string;
  storeId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'prod-milk',
    name: 'Amul Taaza Fresh Milk (1L)',
    description: 'Pasteurized toned milk, premium quality, rich in calcium and vitamins.',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    category: 'Dairy & Eggs',
    brand: 'Amul',
  },
  {
    id: 'prod-rice',
    name: 'India Gate Basmati Rice Premium (1kg)',
    description: 'Aromatic, long-grain basmati rice perfect for biryani and daily meals.',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    category: 'Grocery',
    brand: 'India Gate',
  },
  {
    id: 'prod-eggs',
    name: 'Farm Fresh White Eggs (Pack of 12)',
    description: 'High-protein farm fresh large white eggs, washed and sanitized.',
    image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&h=400&fit=crop',
    category: 'Dairy & Eggs',
    brand: 'Eggo Farms',
  },
  {
    id: 'prod-charger',
    name: 'Anker PowerPort 20W USB-C Fast Charger',
    description: 'Ultra-compact fast charger adapter for iPhone, iPad, and Android devices.',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&h=400&fit=crop',
    category: 'Electronics',
    brand: 'Anker',
  },
  {
    id: 'prod-headphones',
    name: 'Sony WH-CH520 Wireless Headphones',
    description: 'On-ear bluetooth wireless headphones with 50-hour battery life and mic.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    category: 'Electronics',
    brand: 'Sony',
  },
  {
    id: 'prod-crocin',
    name: 'Crocin Pain Relief Tablet (Strip of 15)',
    description: 'Fast acting relief from fever, headache, body aches, and joint pains.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop',
    category: 'Pharmacy',
    brand: 'GSK',
  },
  {
    id: 'prod-banana',
    name: 'Robusta Organic Bananas (Pack of 6)',
    description: 'Fresh, sweet, handpicked organic robusta yellow bananas.',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
    category: 'Fresh Produce',
    brand: 'Local Fresh',
  },
  {
    id: 'prod-bread',
    name: 'English Oven Whole Wheat Bread (400g)',
    description: 'Healthy whole wheat brown bread, freshly baked and soft.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    category: 'Dairy & Eggs',
    brand: 'English Oven',
  },
];

export const STORES: Store[] = [
  {
    id: 'store-freshmart',
    name: 'Fresh Mart Supermarket',
    type: 'Grocery Store',
    address: 'No 45, 100 Feet Rd, Hal 2nd Stage, Indiranagar, Bengaluru, 560038',
    latitude: 12.9752,
    longitude: 77.6412,
    phone: '+91 98765 43210',
    whatsapp: '919876543210',
    rating: 4.6,
    reviewsCount: 148,
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    banner: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    openTime: '07:30 AM',
    closeTime: '10:30 PM',
    verified: true,
  },
  {
    id: 'store-krishnadairy',
    name: 'Sri Krishna Dairy & Provisions',
    type: 'Dairy & Grocery',
    address: 'No 12, 12th Main Rd, Doopanahalli, Indiranagar, Bengaluru, 560008',
    latitude: 12.9702,
    longitude: 77.6368,
    phone: '+91 98450 12345',
    whatsapp: '919845012345',
    rating: 4.8,
    reviewsCount: 89,
    logo: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=100&h=100&fit=crop',
    banner: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    openTime: '06:00 AM',
    closeTime: '09:30 PM',
    verified: true,
  },
  {
    id: 'store-supersave',
    name: 'Super Save Hypermarket',
    type: 'Supermarket',
    address: '228, Double Rd, Stage 2, Indiranagar, Bengaluru, 560038',
    latitude: 12.9658,
    longitude: 77.6435,
    phone: '+91 80412 98765',
    whatsapp: '918041298765',
    rating: 4.2,
    reviewsCount: 320,
    logo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop',
    banner: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    openTime: '08:00 AM',
    closeTime: '11:00 PM',
    verified: true,
  },
  {
    id: 'store-quickpharm',
    name: 'Quick Meds Pharmacy',
    type: 'Pharmacy & Wellness',
    address: 'Shop No 3, CMH Road, Metro Pillar 125, Indiranagar, Bengaluru, 560038',
    latitude: 12.9785,
    longitude: 77.6385,
    phone: '+91 99000 88877',
    whatsapp: '919900088877',
    rating: 4.5,
    reviewsCount: 112,
    logo: 'https://images.unsplash.com/photo-1607619056574-7b8d304a3b24?w=100&h=100&fit=crop',
    banner: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    openTime: '07:00 AM',
    closeTime: '11:30 PM',
    verified: true,
  },
  {
    id: 'store-alphaelectro',
    name: 'Alpha Electronics',
    type: 'Electronics Store',
    address: 'No 512, CMH Road, Indiranagar, Bengaluru, 560038',
    latitude: 12.9790,
    longitude: 77.6455,
    phone: '+91 91234 56789',
    whatsapp: '919123456789',
    rating: 4.4,
    reviewsCount: 65,
    logo: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100&h=100&fit=crop',
    banner: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    openTime: '10:00 AM',
    closeTime: '09:00 PM',
    verified: true,
  },
  {
    id: 'store-organicpro',
    name: 'Organic Harvest Co.',
    type: 'Fresh Produce Store',
    address: 'No 89, 4th Cross Rd, Domlur Layout, Bengaluru, 560071',
    latitude: 12.9610,
    longitude: 77.6355,
    phone: '+91 98888 77777',
    whatsapp: '919888877777',
    rating: 4.7,
    reviewsCount: 42,
    logo: 'https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=100&h=100&fit=crop',
    banner: 'linear-gradient(135deg, #10B981 0%, #065F46 100%)',
    openTime: '08:00 AM',
    closeTime: '08:30 PM',
    verified: true,
  },
];

export const STORE_PRODUCTS: StoreProduct[] = [
  // Fresh Mart inventory
  { id: 'inv-1', storeId: 'store-freshmart', productId: 'prod-milk', price: 32.0, stockCount: 45, isAvailable: true },
  { id: 'inv-2', storeId: 'store-freshmart', productId: 'prod-rice', price: 110.0, stockCount: 15, isAvailable: true },
  { id: 'inv-3', storeId: 'store-freshmart', productId: 'prod-eggs', price: 84.0, stockCount: 20, isAvailable: true },
  { id: 'inv-4', storeId: 'store-freshmart', productId: 'prod-banana', price: 48.0, stockCount: 30, isAvailable: true },
  { id: 'inv-5', storeId: 'store-freshmart', productId: 'prod-bread', price: 42.0, stockCount: 12, isAvailable: true },

  // Krishna Dairy inventory
  { id: 'inv-6', storeId: 'store-krishnadairy', productId: 'prod-milk', price: 30.0, stockCount: 60, isAvailable: true },
  { id: 'inv-7', storeId: 'store-krishnadairy', productId: 'prod-eggs', price: 80.0, stockCount: 40, isAvailable: true },
  { id: 'inv-8', storeId: 'store-krishnadairy', productId: 'prod-bread', price: 40.0, stockCount: 25, isAvailable: true },
  { id: 'inv-9', storeId: 'store-krishnadairy', productId: 'prod-banana', price: 50.0, stockCount: 15, isAvailable: true },

  // Super Save inventory
  { id: 'inv-10', storeId: 'store-supersave', productId: 'prod-milk', price: 31.5, stockCount: 100, isAvailable: true },
  { id: 'inv-11', storeId: 'store-supersave', productId: 'prod-rice', price: 105.0, stockCount: 80, isAvailable: true },
  { id: 'inv-12', storeId: 'store-supersave', productId: 'prod-eggs', price: 82.0, stockCount: 50, isAvailable: true },
  { id: 'inv-13', storeId: 'store-supersave', productId: 'prod-charger', price: 1499.0, stockCount: 8, isAvailable: true },
  { id: 'inv-14', storeId: 'store-supersave', productId: 'prod-headphones', price: 4499.0, stockCount: 4, isAvailable: true },
  { id: 'inv-15', storeId: 'store-supersave', productId: 'prod-bread', price: 41.0, stockCount: 30, isAvailable: true },
  { id: 'inv-16', storeId: 'store-supersave', productId: 'prod-banana', price: 45.0, stockCount: 40, isAvailable: true },

  // Quick Pharmacy inventory
  { id: 'inv-17', storeId: 'store-quickpharm', productId: 'prod-crocin', price: 60.0, stockCount: 120, isAvailable: true },
  { id: 'inv-18', storeId: 'store-quickpharm', productId: 'prod-milk', price: 33.0, stockCount: 10, isAvailable: true },

  // Alpha Electronics inventory
  { id: 'inv-19', storeId: 'store-alphaelectro', productId: 'prod-charger', price: 1399.0, stockCount: 25, isAvailable: true },
  { id: 'inv-20', storeId: 'store-alphaelectro', productId: 'prod-headphones', price: 4299.0, stockCount: 12, isAvailable: true },

  // Organic Harvest Co inventory
  { id: 'inv-21', storeId: 'store-organicpro', productId: 'prod-banana', price: 55.0, stockCount: 50, isAvailable: true },
  { id: 'inv-22', storeId: 'store-organicpro', productId: 'prod-rice', price: 135.0, stockCount: 20, isAvailable: true },
];

export const REVIEWS: Review[] = [
  {
    id: 'rev-1',
    storeId: 'store-freshmart',
    userName: 'Aarav Sharma',
    rating: 5,
    comment: 'Super fast pickup! Placed search here, went to shop, they had item packed. Highly recommend.',
    date: '2 days ago',
  },
  {
    id: 'rev-2',
    storeId: 'store-freshmart',
    userName: 'Neha Patel',
    rating: 4,
    comment: 'Stock is always updated. Price is very reasonable.',
    date: '1 week ago',
  },
  {
    id: 'rev-3',
    storeId: 'store-krishnadairy',
    userName: 'Rahul Verma',
    rating: 5,
    comment: 'Best store in Indiranagar for fresh milk and dairy items. Always open early in the morning!',
    date: '3 days ago',
  },
  {
    id: 'rev-4',
    storeId: 'store-krishnadairy',
    userName: 'Siddharth M.',
    rating: 5,
    comment: 'Super friendly local shop. Prices are cheaper than the supermarkets!',
    date: 'Yesterday',
  },
  {
    id: 'rev-5',
    storeId: 'store-supersave',
    userName: 'Pooja Hegde',
    rating: 4,
    comment: 'Very big store, has almost everything. Parking is slightly tough during peak hours.',
    date: '5 days ago',
  },
  {
    id: 'rev-6',
    storeId: 'store-quickpharm',
    userName: 'Karthik Rao',
    rating: 5,
    comment: 'Life saver pharmacy, open late. Got my medicines instantly.',
    date: '3 days ago',
  },
  {
    id: 'rev-7',
    storeId: 'store-alphaelectro',
    userName: 'Vikram Singh',
    rating: 4,
    comment: 'Great selection of original Anker chargers. They are an authorized reseller.',
    date: '2 weeks ago',
  },
];
