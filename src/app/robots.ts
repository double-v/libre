import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/chat/', '/discover/', '/crossings/', '/nearby/', '/matches/', '/profile/', '/settings/'],
    },
    sitemap: 'https://libre.rencontres.app/sitemap.xml',
  };
}