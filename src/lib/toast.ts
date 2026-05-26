export function toast(message: string) {
  if (typeof window === 'undefined') return;

  const toastDiv = document.createElement('div');
  toastDiv.textContent = message;
  toastDiv.style.position = 'fixed';
  toastDiv.style.bottom = '20px';
  toastDiv.style.right = '20px';
  toastDiv.style.maxWidth = 'min(360px, calc(100vw - 32px))';
  toastDiv.style.background = 'rgba(24,24,27,0.96)';
  toastDiv.style.color = '#fff';
  toastDiv.style.padding = '10px 14px';
  toastDiv.style.border = '1px solid rgba(255,255,255,0.10)';
  toastDiv.style.borderRadius = '10px';
  toastDiv.style.boxShadow = '0 10px 28px rgba(0,0,0,0.28)';
  toastDiv.style.zIndex = '10000';
  toastDiv.style.fontSize = '12px';
  toastDiv.style.fontWeight = '700';
  document.body.appendChild(toastDiv);
  setTimeout(() => toastDiv.remove(), 3000);
}
