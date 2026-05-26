import React, { useState } from 'react';
import { toast } from '@/lib/toast';

interface ProductData {
  barcode: string;
  name: string;
  image: string;
  brand: string;
  category: string;
  description: string;
  packaging: string;
  // seller-entered fields
  price?: number | string;
  stock?: number | string;
  discount?: number | string | null;
}

interface Props {
  data: ProductData;
  onCancel: () => void;
  onSaved?: (product: SavedProduct) => void;
}

interface SavedProduct extends ProductData {
  existing?: boolean;
}

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ProductPreview: React.FC<Props> = ({ data, onCancel, onSaved }) => {
  const [price, setPrice] = useState(toNumber(data.price));
  const [stock, setStock] = useState(toNumber(data.stock));
  const [discount, setDiscount] = useState(toNumber(data.discount));

  const handleSubmit = async () => {
    const payload = {
      barcode: data.barcode,
      name: data.name,
      image: data.image,
      brand: data.brand,
      category: data.category,
      description: data.description,
      packaging: data.packaging,
      price,
      stock,
      discount,
    };
    try {
      const res = await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || 'Failed to create product');
        return;
      }
      const saved = await res.json() as SavedProduct;
      toast(saved?.existing ? 'Product updated successfully' : 'Product created successfully');
      if (onSaved) {
        onSaved(saved);
      } else {
        onCancel(); // go back to scanner
      }
    } catch (e) {
      console.error(e);
      toast('Network error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-2">Product Preview</h2>
      <img src={data.image} alt={data.name} className="w-full h-48 object-cover mb-2" />
      <p><strong>Name:</strong> {data.name}</p>
      <p><strong>Brand:</strong> {data.brand}</p>
      <p><strong>Category:</strong> {data.category}</p>
      <p><strong>Description:</strong> {data.description}</p>
      <p><strong>Packaging:</strong> {data.packaging}</p>
      <div className="mt-4 space-y-2">
        <div>
          <label className="block text-sm font-medium">Price (₹)</label>
          <input type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="mt-1 block w-full border rounded p-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Stock Quantity</label>
          <input type="number" value={stock} onChange={e => setStock(parseInt(e.target.value))} className="mt-1 block w-full border rounded p-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Discount (%)</label>
          <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value))} className="mt-1 block w-full border rounded p-1" />
        </div>
      </div>
      <div className="mt-4 flex justify-between">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
        <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Create Product</button>
      </div>
    </div>
  );
};

export default ProductPreview;
