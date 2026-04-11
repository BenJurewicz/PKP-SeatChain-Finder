const CARRIER_COLORS: Record<string, string> = {
  EIP: '#142458',
  IC: '#F58220',
  TLK: '#1E5C4D',
};

export function getCarrierColor(carrierId: string): string {
  return CARRIER_COLORS[carrierId.toUpperCase()] || '#6b7280';
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}