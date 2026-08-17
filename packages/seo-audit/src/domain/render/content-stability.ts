export const stabilityInitScript = `(() => {
  const state = { lastMutation: performance.now(), mutationCount: 0 };
  Object.defineProperty(window, "__SEO_AUDIT_STABILITY__", { value: state, configurable: false });
  new MutationObserver((records) => {
    if (records.length > 0) {
      state.lastMutation = performance.now();
      state.mutationCount += records.length;
    }
  }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
})()`;
