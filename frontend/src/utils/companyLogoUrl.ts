export function companyLogoUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  const domain = website
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
  if (!domain) return null;
  return `https://logos.hunter.io/${domain}`;
}
