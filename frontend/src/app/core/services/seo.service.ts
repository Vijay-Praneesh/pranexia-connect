import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogUrl?: string;
  ogType?: 'website' | 'article';
  canonical?: string;
  canonicalUrl?: string;
  robots?: string;
  schema?: object | object[];
}

export const SITE_URL = 'https://seyyonconnect.in';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/meta-tag.png`;
export const DEFAULT_OG_IMAGE_ALT = 'Seyyon Connect customer engagement platform';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  updateSeo(config: SeoConfig): void {
    const pageTitle = config.title;
    const metaDescription = config.description;
    const ogImage = config.ogImage || DEFAULT_OG_IMAGE;
    const ogImageAlt = config.ogImageAlt || DEFAULT_OG_IMAGE_ALT;
    const canonical = config.canonical || config.canonicalUrl || SITE_URL;
    const ogType = config.ogType || 'website';
    const robots = config.robots || 'index, follow';

    // Document Title
    this.title.setTitle(pageTitle);

    // Standard Meta Tags
    this.meta.updateTag({ name: 'description', content: metaDescription });
    this.meta.updateTag({ name: 'robots', content: robots });

    // Open Graph Metadata
    this.meta.updateTag({ property: 'og:site_name', content: 'Seyyon Connect' });
    this.meta.updateTag({ property: 'og:locale', content: 'en_IN' });
    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:title', content: config.ogTitle || pageTitle });
    this.meta.updateTag({ property: 'og:description', content: config.ogDescription || metaDescription });
    this.meta.updateTag({ property: 'og:url', content: config.ogUrl || canonical });
    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({ property: 'og:image:alt', content: ogImageAlt });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });

    // Twitter Card Metadata
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: config.ogTitle || pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.ogDescription || metaDescription });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });

    // Canonical Tag
    this.setCanonicalUrl(canonical);

    // JSON-LD Structured Data
    if (config.schema) {
      this.setJsonLd(config.schema);
    }
  }

  setCanonicalUrl(url: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  setJsonLd(schema: object | object[], scriptId = 'seyyon-jsonld-schema'): void {
    let script: HTMLScriptElement | null = this.document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }

  getOrganizationSchema(): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Seyyon Connect',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/assets/seyyon-logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'pranexia.studio@gmail.com',
        contactType: 'customer support',
      },
    };
  }

  getBreadcrumbSchema(items: { name: string; url: string }[]): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  getWebSiteSchema(): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Seyyon Connect',
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
    };
  }
}
