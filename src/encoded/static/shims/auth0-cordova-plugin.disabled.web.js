// Disable the Auth0 Cordova plugin for web builds.
// Important: do NOT set window.CordovaAuth0Plugin here.

export default function CordovaAuth0PluginDisabled() {
  // Constructible, but intentionally inert.
}

CordovaAuth0PluginDisabled.prototype.setWebAuth = function () {};
CordovaAuth0PluginDisabled.prototype.authorize = function () {
  return Promise.reject(new Error("Cordova Auth0 plugin is disabled in web builds."));
};
CordovaAuth0PluginDisabled.prototype.clearSession = function () {
  return Promise.reject(new Error("Cordova Auth0 plugin is disabled in web builds."));
};

// Some versions check .version; include it to avoid version errors if referenced.
CordovaAuth0PluginDisabled.version = "9.30.1";
CordovaAuth0PluginDisabled.prototype.version = "9.30.1";