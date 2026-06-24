if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    // Capture whether there was already a controller BEFORE registering
    // This prevents false reload on first visit (clients.claim() sets controller during activation)
    const hadPreviousController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates every 60 minutes
      setInterval(() => reg.update(), 60 * 60 * 1000);

      // When a new SW is installed, listen for it to take over
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && hadPreviousController) {
            // New SW activated AND there was a previous controller — reload to get fresh content
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
