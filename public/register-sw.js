if ('serviceWorker' in navigator) {
  if (document.readyState === 'complete') {
    navigator.serviceWorker.register('/service-worker.js').catch(function(err) {
      console.error('Service worker registration failed:', err);
    });
  } else {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/service-worker.js').catch(function(err) {
        console.error('Service worker registration failed:', err);
      });
    });
  }
}
