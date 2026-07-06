import { describe, it, expect } from 'vitest';
import { buildGoogleEmbedUrl, buildGoogleSearchUrl, buildGoogleDirectionsUrl } from './mapUrls';

const store = { latitude: 12.9752, longitude: 77.6412 };

describe('mapUrls', () => {
  describe('buildGoogleEmbedUrl', () => {
    it('centers a keyless embed on the exact coordinates', () => {
      const url = buildGoogleEmbedUrl(store);
      expect(url).toContain('output=embed');
      expect(url).toContain('q=12.9752,77.6412');
      expect(url).toContain('z=16');
    });

    it('uses the provided zoom level', () => {
      expect(buildGoogleEmbedUrl(store, 18)).toContain('z=18');
    });

    it('clamps the zoom to the valid 1-21 range', () => {
      expect(buildGoogleEmbedUrl(store, 99)).toContain('z=21');
      expect(buildGoogleEmbedUrl(store, -5)).toContain('z=1');
    });

    it('rounds coordinates to 6 decimal places', () => {
      const url = buildGoogleEmbedUrl({ latitude: 12.12345678, longitude: 77.87654321 });
      expect(url).toContain('q=12.123457,77.876543');
    });
  });

  describe('buildGoogleSearchUrl', () => {
    it('builds a maps search deep link to the coordinates', () => {
      expect(buildGoogleSearchUrl(store)).toBe(
        'https://www.google.com/maps/search/?api=1&query=12.9752,77.6412'
      );
    });
  });

  describe('buildGoogleDirectionsUrl', () => {
    it('builds a directions deep link with the destination', () => {
      expect(buildGoogleDirectionsUrl(store)).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=12.9752,77.6412'
      );
    });
  });
});
