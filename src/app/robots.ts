import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const publicOnly = { allow: '/', disallow: ['/api/', '/chat/', '/discover/', '/crossings/', '/nearby/', '/matches/', '/profile/', '/settings/'] };

  return {
    rules: [
      { userAgent: '*', ...publicOnly },
      // Explicitly welcome AI crawlers (same access as general bots)
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'],
        ...publicOnly,
      },
    ],
    sitemap: 'https://www.getlibre.fr/sitemap.xml',
  };
}