import React, { useState } from 'react';
import { toast } from '@/lib/toast';

interface Props {
  onCancel: () => void;
  initialBarcode?: string;
  /** Callback invoked with the created product after successful creation */
  onCreated?: (product: CreatedProduct) => void;
}

interface CreatedProduct {
  barcode: string;
  name: string;
  image: string;
  brand: string;
  category: string;
  description: string;
  packaging: string;
  price?: number | string;
  stock?: number | string;
  discount?: number | string | null;
  existing?: boolean;
}

const ManualProductForm: React.FC<Props> = ({ onCancel, initialBarcode = '', onCreated }) => {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [packaging, setPackaging] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [discount, setDiscount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      barcode,
      name,
      image,
      brand,
      category,
      description,
      packaging,
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
      const created = await res.json() as CreatedProduct;
      toast(created?.existing ? 'Product updated successfully' : 'Product created successfully');
      // Notify parent about newly created product (including barcode)
      if (onCreated) {
        onCreated(created);
      } else {
        // Fallback: simply close the form
        onCancel();
      }
    } catch (e) {
      console.error(e);
      toast('Network error');
    }
  };

  return (
    <form className="bg-white rounded-lg shadow p-4 max-w-md mx-auto" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-2">Manual Product Entry</h2>
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Barcode" value={barcode} onChange={e => setBarcode(e.target.value)} className="col-span-2 border p-1 rounded" required readOnly={Boolean(initialBarcode)} />
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="col-span-2 border p-1 rounded" required />
        <input placeholder="Image URL" value={image} onChange={e => setImage(e.target.value)} className="col-span-2 border p-1 rounded" />
        <input placeholder="Brand" value={brand} onChange={e => setBrand(e.target.value)} className="border p-1 rounded" />
        <input placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} className="border p-1 rounded" />
        <input placeholder="Price" type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="border p-1 rounded" required />
        <input placeholder="Stock" type="number" value={stock} onChange={e => setStock(parseInt(e.target.value))} className="border p-1 rounded" required />
        <input placeholder="Discount %" type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value))} className="border p-1 rounded" />
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="col-span-2 border p-1 rounded" rows={2} />
        <textarea placeholder="Packaging" value={packaging} onChange={e => setPackaging(e.target.value)} className="col-span-2 border p-1 rounded" rows={2} />
      </div>
      <div className="mt-4 flex justify-between">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Create Product</button>
      </div>
    </form>
  );
};

export default ManualProductForm;
