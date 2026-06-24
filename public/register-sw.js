if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    // Track whether a controller existed before THIS registration cycle.
    // Used to avoid false reload on first visit (clients.claim() sets
    // controller during activation). Updated on each registration so
    // in-session updates also trigger a reload when appropriate.
    let hadPreviousController = !!navigator.serviceWorker.controller;

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
          // After first activation cycle, update flag so subsequent
          // in-session updates still trigger reload when needed
          if (newWorker.state === 'activated') {
            hadPreviousController = true;
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
