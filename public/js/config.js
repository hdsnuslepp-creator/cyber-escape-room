/**
 * Host detection — GitHub Pages serves static files only (no Node/API).
 */
const AppConfig = {
  isStaticHost() {
    return location.hostname.endsWith('github.io');
  },

  apiUrl(path) {
    if (this.isStaticHost()) return null;
    return '/api' + path;
  },
};
