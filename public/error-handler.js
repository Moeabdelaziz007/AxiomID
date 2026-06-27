window.addEventListener('unhandledrejection', function(event) {
  if (!event.reason) return;
  var reasonStr = '';
  if (typeof event.reason === 'string') {
    reasonStr = event.reason;
  } else if (event.reason instanceof Error) {
    reasonStr = event.reason.message || event.reason.toString();
  } else if (typeof event.reason === 'object') {
    reasonStr = event.reason.message || event.reason.error || String(event.reason);
  } else {
    reasonStr = String(event.reason);
  }
  var normalized = reasonStr.toLowerCase();
  if (normalized.indexOf('connection closed') !== -1 || normalized.indexOf('connection_closed') !== -1) {
    event.preventDefault();
  }
});
