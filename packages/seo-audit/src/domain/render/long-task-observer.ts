export const longTaskObserverInitScript = `(() => {
  const state = { entries: [], total: 0 };
  Object.defineProperty(window, "__SEO_AUDIT_LONG_TASKS__", { value: state, configurable: false });
  if (typeof PerformanceObserver !== "function" || !PerformanceObserver.supportedEntryTypes.includes("longtask")) return;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      state.total += 1;
      if (state.entries.length < 200) {
        state.entries.push({
          sequence: state.total - 1,
          startTimeMs: entry.startTime,
          durationMs: entry.duration,
          name: entry.name || "unknown",
        });
      }
    }
  });
  observer.observe({ type: "longtask", buffered: true });
})()`;
