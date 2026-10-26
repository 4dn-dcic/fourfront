// The manual JSDOM window can finish loading after a synchronous suite ends.
// Let its real load event complete while Jest globals still exist, then release
// its listeners and the app's fake timers rather than leaking into teardown.
afterAll(() => {
    const loaded = document.readyState === 'complete' ? Promise.resolve() :
        new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
    return loaded.then(() => {
        window.close();
        jest.clearAllTimers();
    });
});
