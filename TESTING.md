# Testing Strategy

The Collaborative Reality Editor employs a multi-layer testing strategy to ensure code quality, stability, and a good user experience.

## Test Levels

1. **Unit Tests:**
    *   Focus: Individual components (functions, classes, modules).
    *   Tools: Jest, Mocha, or similar.
    *   Purpose: Verify that each component behaves as expected in isolation.
2. **Integration Tests:**
    *   Focus: Interactions between components.
    *   Tools: Jest, Mocha, or similar.
    *   Purpose: Ensure that different parts of the system work together correctly.
3. **End-to-End (E2E) Tests:**
    *   Focus: User flows and UI interactions.
    *   Tools: Cypress, Selenium, or similar.
    *   Purpose: Simulate real user scenarios and test the application as a whole from the user's perspective.

## Test Commands

*   `npm test`: Run all test suites (unit, integration, and E2E).
*   `npm run test:unit`: Run only unit tests.
*   `npm run test:integration`: Run only integration tests.
*   `npm run test:e2e`: Run only E2E tests.
*   `npm run test:server`: Run server-side tests.
*   `npm run test:ui`: Run browser-based UI tests.

## Test Directory Structure

The test directory structure mirrors the source code structure:

```
collaborative-reality-editor/
├── src/
│   ├── components/
│   │   └── MyComponent.ts
│   ├── ...
└── test/
    ├── components/
    │   └── MyComponent.test.ts
    ├── ...
```

This structure makes it easy to locate tests for specific components and promotes a clear organization of test code.
