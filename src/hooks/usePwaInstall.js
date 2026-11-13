import { useState, useEffect, useCallback } from 'react';

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.navigator?.standalone === true
  );
}

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/**
 * PWA 브라우저 앱 설치(A2HS / Standalone App) 상태 및 프롬프트 훅
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(detectStandalone);
  const [platform] = useState(detectPlatform);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        setIsStandalone(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery?.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { outcome: 'manual' };
    }
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choiceResult?.outcome === 'accepted') {
        return { outcome: 'accepted' };
      }
      return { outcome: 'dismissed' };
    } catch {
      return { outcome: 'manual' };
    }
  }, [deferredPrompt]);

  return {
    isStandalone,
    canNativePrompt: Boolean(deferredPrompt),
    platform,
    triggerInstall,
  };
}
