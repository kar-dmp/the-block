import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollTo; Detail.jsx calls it on mount. Some test
// files run under the plain `node` environment (pure-logic tests with no
// DOM), where `window` doesn't exist at all — guard for that.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
