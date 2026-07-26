'use client';

import { useEffect } from 'react';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  useEffect(() => {
    // Dynamic import to avoid SSR issues with isomorphic-dompurify/jsdom
    import('isomorphic-dompurify').then(({ default: DOMPurify }) => {
      const script = document.querySelector('script[type="application/ld+json"]');
      if (script) {
        script.innerHTML = DOMPurify.sanitize(JSON.stringify(data));
      }
    });
  }, [data]);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}