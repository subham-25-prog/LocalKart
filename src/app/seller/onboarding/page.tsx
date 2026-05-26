// src/app/seller/onboarding/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { loadStoreProfile, saveStoreProfile, StoreProfile } from '@/lib/sellerProfile';

// Simple three step wizard component
export default function SellerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [profile, setProfile] = useState<StoreProfile>(
    loadStoreProfile() ?? {
      name: '',
      handle: '',
      description: '',
      logo: '',
      banner: '',
      phone: '',
      address: '',
      pickupLocation: '',
      businessCategory: '',
      upiDetails: '',
      bankDetails: '',
      openTime: '',
      closeTime: '',
      isOpen: true,
      tags: '',
    },
  );

  // Persist partial progress on step change
  useEffect(() => {
    saveStoreProfile(profile);
  }, [profile]);

  const handleChange = (field: keyof StoreProfile, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const submit = () => {
    // Final save (already saved in localStorage) and notify user
    toast('Store profile saved');
    router.replace('/seller/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 mt-8 matte-card animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-6 text-center">Seller Onboarding</h1>

      {step === 1 && (
        <section>
          <h2 className="text-xl font-semibold text-zinc-200 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <input
              className="w-full matte-input"
              placeholder="Store Name"
              value={profile.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
            <input
              className="w-full matte-input"
              placeholder="Handle (URL slug)"
              value={profile.handle}
              onChange={(e) => handleChange('handle', e.target.value)}
            />
            <textarea
              className="w-full matte-input"
              placeholder="Description"
              rows={3}
              value={profile.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="text-xl font-semibold text-zinc-200 mb-4">Contact & Location</h2>
          <div className="space-y-4">
            <input
              className="w-full matte-input"
              placeholder="Phone"
              value={profile.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
            <input
              className="w-full matte-input"
              placeholder="Address"
              value={profile.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
            <input
              className="w-full matte-input"
              placeholder="Pickup Location"
              value={profile.pickupLocation}
              onChange={(e) => handleChange('pickupLocation', e.target.value)}
            />
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="text-xl font-semibold text-zinc-200 mb-4">Payments & Operations</h2>
          <div className="space-y-4">
            <input
              className="w-full matte-input"
              placeholder="Business Category"
              value={profile.businessCategory}
              onChange={(e) => handleChange('businessCategory', e.target.value)}
            />
            <input
              className="w-full matte-input"
              placeholder="UPI ID"
              value={profile.upiDetails}
              onChange={(e) => handleChange('upiDetails', e.target.value)}
            />
            <input
              className="w-full matte-input"
              placeholder="Bank Details"
              value={profile.bankDetails}
              onChange={(e) => handleChange('bankDetails', e.target.value)}
            />
            <input
              className="w-full matte-input"
              placeholder="Open Time (e.g., 08:00 AM)"
              value={profile.openTime}
              onChange={(e) => handleChange('openTime', e.target.value)}
            />
            <input
              className="w-full matte-input"
              placeholder="Close Time (e.g., 10:00 PM)"
              value={profile.closeTime}
              onChange={(e) => handleChange('closeTime', e.target.value)}
            />
            <input
              className="w-full matte-input"
              placeholder="Tags (comma separated)"
              value={profile.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
            />
          </div>
        </section>
      )}

      <div className="flex justify-between mt-6">
        {step > 1 && (
          <button className="matte-button-secondary" onClick={prevStep}>
            ← Previous
          </button>
        )}
        {step < 3 && (
          <button className="ml-auto matte-button-primary" onClick={nextStep}>
            Next →
          </button>
        )}
        {step === 3 && (
          <button className="ml-auto matte-button-primary" onClick={submit}>
            Save & Continue
          </button>
        )}
      </div>
    </div>
  );
}
