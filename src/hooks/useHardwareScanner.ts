import { useEffect, useRef } from 'react';

/**
 * Custom hook to detect input from a hardware barcode scanner device (keyboard emulation).
 * Hardware scanners send keystrokes extremely rapidly, typically followed by an 'Enter' key.
 * @param onDetected Callback function triggered when a barcode is successfully parsed.
 */
export function useHardwareScanner(onDetected: (barcode: string) => void) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        // Standard barcodes are numeric, typically between 8 and 14 digits
        if (barcode && barcode.length >= 8 && /^\d+$/.test(barcode)) {
          e.preventDefault();
          e.stopPropagation();
          onDetected(barcode);
        }
        bufferRef.current = '';
      } else {
        // If characters are typed slowly, it's human typing. Reset the buffer.
        // A threshold of 50ms is very safe for hardware scanners which transmit under 10ms.
        if (timeDiff > 50) {
          bufferRef.current = '';
        }

        // Only append single characters (ignore function keys, backspace, arrow keys, etc.)
        if (e.key.length === 1) {
          bufferRef.current += e.key;
        }
      }
    };

    // Attach listener with capture phase to intercept the scan input before form fields capture it
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onDetected]);
}
