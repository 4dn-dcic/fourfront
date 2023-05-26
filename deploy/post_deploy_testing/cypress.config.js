const { defineConfig } = require('cypress');

module.exports = defineConfig({
    projectId: '4opx2c',
    defaultCommandTimeout: 60000,
    pageLoadTimeout: 120000,
    requestTimeout: 40000,
    responseTimeout: 120000,
    blockHosts: 'www.google-analytics.com',
    video: false,
    chromeWebSecurity: false,
    e2e: {
        // We've imported your old cypress plugins here.
        // You may want to clean this up later by importing these.
        setupNodeEvents(on, config) {
            return require('./cypress/plugins/index.js')(on, config);
        },
        baseUrl: 'https://data.4dnucleome.org',
        specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
        testIsolation: false
    },
});
