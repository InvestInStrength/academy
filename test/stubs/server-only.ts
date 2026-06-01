// Vitest alias target for the `server-only` package, which is resolved by Next
// in real builds but doesn't exist as a real module in node_modules. The stub
// is a no-op — tests already run in Node, so the `server-only` enforcement
// (only-on-server) is implicitly satisfied.
export {};
