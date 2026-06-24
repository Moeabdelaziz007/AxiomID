if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates every 60 minutes
      setInterval(() => reg.update(), 60 * 60 * 1000);

      // When a new SW is installed, listen for it to take over
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            // New SW activated — reload to get fresh content
            window.location.reload();
          }
        });
      });
    }).catch(err => {
      console.error('Service worker registration failed:', err);
    });
  };

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker);
  }
}
