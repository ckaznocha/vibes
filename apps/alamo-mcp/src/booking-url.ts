export function bookingUrl(options: {
  market?: string;
  presentationSlug: string;
}): string {
  const market = options.market ?? "austin";
  return `https://drafthouse.com/${encodeURIComponent(market)}/show/${encodeURIComponent(options.presentationSlug)}`;
}
