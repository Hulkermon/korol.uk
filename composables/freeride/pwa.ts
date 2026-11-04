export const FREERIDE_PWA_HEAD = {
  link: [
    { key: 'manifest', rel: 'manifest', href: '/freeride.webmanifest' },
    {
      key: 'apple-touch-icon',
      rel: 'apple-touch-icon',
      href: '/freeride-icons/apple-touch-icon.png',
    },
  ],
  meta: [
    { name: 'theme-color', content: '#1f2a37' },
    { name: 'apple-mobile-web-app-title', content: 'Freeride' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'mobile-web-app-capable', content: 'yes' },
  ],
};

export async function registerFreerideSw(
  nav: Navigator | undefined = globalThis.navigator,
  dev = false,
): Promise<boolean> {
  if (dev || !nav?.serviceWorker) return false;
  try {
    await nav.serviceWorker.register('/freeride-sw.js', { scope: '/freeride' });
    return true;
  } catch {
    return false;
  }
}
