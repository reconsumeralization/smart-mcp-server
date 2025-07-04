
// A simple logger for use before the main logger is initialized.
const preConfigLogger = {
  debug: (message) => console.log(`[DEBUG] ${message}`),
  error: (message, err) => console.error(`[ERROR] ${message}`, err),
};

export default preConfigLogger;
