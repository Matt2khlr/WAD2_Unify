import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

export async function performLogout(router) {
  try {
    window.dispatchEvent(new CustomEvent('beforeLogout'));
    await new Promise(resolve => setTimeout(resolve, 100));
    await signOut(auth);

    localStorage.clear();
    sessionStorage.clear();

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    await router.push('/login');
  } catch (e) {
    console.error('Logout failed:', e);
  }
}