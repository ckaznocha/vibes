export function bookingUrl(options: {
  market?: string;
  presentationSlug: string;
}): string {
  const market = options.market ?? "los-angeles";
  return `https://drafthouse.com/${encodeURIComponent(market)}/show/${encodeURIComponent(options.presentationSlug)}`;
}
