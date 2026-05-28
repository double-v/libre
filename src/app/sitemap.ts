import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.getlibre.fr';
  // Use fixed dates — update when page content actually changes
  return [
    { url: baseUrl, lastModified: '2026-05-28', changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/register`, lastModified: '2026-05-28', changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: '2026-05-28', changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/cgu`, lastModified: '2026-05-28', changeFrequency: 'yearly', priority: 0.3 },
  ];
}