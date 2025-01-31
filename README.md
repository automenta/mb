# Collaborative Reality Editor

Organize, prioritize, and grow thoughts into actionable results with real-time communication, matching, and analysis.

## Features

### Object Management

- **Shared Objects:** Create, prioritize, and manage data collaboratively as `NObject`s.
- **Thought Evolution:** `NObject`s describe thoughts and ideas, producing tangible matched results.
- **Privacy by Default:** All `NObject`s are private unless explicitly shared.

### Search and Matching

- **Persistent Queries:** `NObject`s can act as ongoing search interests (persistent queries), actively seeking matches within the network.
- **Semantic Matching:** `NObject`s capture meaning and intent, acting as implicit goals to realize.
- **Tags:** `NObject` tags (schemas) ensure unambiguous and multilingual meaningful exchange.
- **Notifications:** The app receives matches to shared `NObject`s as replies, storing them for display similar to email or forum replies.

### P2P Networking

- **Decentralized:**
    - WebRTC for direct peer-to-peer communication.
    - Optional supernode implementation supporting advanced applications, large-scale coordination, and fallback.
- **Synchronized:**
    - `yjs` CRDT enables incremental updates and offline editing.
    - WebRTC allows direct peer-to-peer communication (text/voice/video/screensharing).
- **Secure:**
    - End-to-end encryption protects private data.
    - Crypto-signing ensures `NObject` integrity and provenance.

### User Interface

- **Main View:** Unified interface for viewing, creating, and editing `NObject`s.
- **Sidebar Navigation:**
    - **Me:** User profile, biography objects, and preferences.
    - **Friends:** Status updates from connections.
    - **Network:** Peer activity and traffic visualization.
    - **Database:** Sortable, filterable data views.
- **Dark Mode:** Supported theme for visual comfort.

## Design

### UI

- Single-page application using TypeScript/JavaScript.
- Dynamic components for flexibility and reusability.
- `yjs` ensures real-time collaborative editing.


### Server ("Supernode")

- Node.js-based optional supernode.
- Supernodes can fully utilize a computer to assist with processing, networking, and storage.
- WebSocket connection to serve the UI client, providing additional functionality.
- **Network:**
    - UDP Gossip Protocol.
    - BitTorrent DHT - bootstrap.
    - LibP2P - bootstrap.
- **Database:**
    - In-memory caching + persistent storage for durability and scalability.
    - LevelDB.
    - IPFS - decentralized storage.
- **Plugins:**
    - **Input:** Screenshot, etc.
    - **Analysis:** OCR, etc.

## Implementation

### Build

- Node.js, TypeScript, NPM.
- `vite` for fast development and optimized builds.
- `vitest` for testing.

### Testing

- `npm test` - Run all test suites (core, server, and UI tests)
- `npm run test:core` - Run core tests (node environment tests for core logic)
- `npm run test:server` - Run server tests (node environment tests for server-side functionality)
- `npm run test:ui` - Run browser-based UI tests (tests that require a browser environment)

**Running Tests and Interpreting Results:**

1.  **Run a test command:** Choose the appropriate test command from the list above based on the area you want to test. For example, to run core tests, use `npm run test:core`.

2.  **Observe the output:** Vitest will run the tests and provide output in the console.

    -   **Passed Tests:** If all tests pass, you will see a summary indicating the number of passed tests and the time taken.  Look for lines like `[2m Test Files  [22m [1m [32mX passed [39m [22m` and `[2m      Tests  [22m [1m [32mY passed [39m [22m`.

    -   **Failed Tests:** If any tests fail, Vitest will indicate the number of failed tests and provide detailed information about each failure. Look for lines like `[2m Test Files  [22m  [1m [31mZ failed [39m [22m` and `[2m      Tests  [22m  [1m [31mW failed [39m [22m`.

3.  **Investigate Failures:** When tests fail, carefully examine the output for:

    -   **File and Test Name:** Identify the file and the specific test that failed. This will be indicated in the output, for example: `[31m [1m [7m FAIL  [27m [22m [39m test/core/db.test.ts [2m >  [22mDB [2m >  [22mcreate and retrieve replies`.

    -   **Error Message and Stack Trace:**  Vitest provides error messages and stack traces to help pinpoint the cause of the failure. Look for `AssertionError`, `TypeError`, `ReferenceError`, or other error types, along with the stack trace that shows where the error occurred in your code.

    -   **Expected vs. Received Values:** For assertion failures, Vitest often shows the expected value and the value that was actually received, helping you understand why the assertion failed.

4.  **Debug and Fix:** Based on the failure information, debug your code and fix the issues causing the tests to fail.  You may need to:

    -   **Review the test code:** Ensure the test is correctly written and accurately tests the intended functionality.
    -   **Review the source code:** Examine the source code being tested for bugs or incorrect logic.
    -   **Use debugging tools:** Utilize your IDE's debugger or `console.log` statements to step through the code and understand the program's state when the test fails.

5.  **Re-run Tests:** After making changes, re-run the tests to verify that the failures are resolved and all tests now pass. Repeat the process of investigating failures, debugging, and re-running tests until all tests pass.

**Unhandled Errors and Rejections:**

The test output may also show "Unhandled Errors" or "Unhandled Rejections". These indicate errors that occurred outside of the test assertions, such as during setup or in asynchronous operations.  Investigate these errors separately as they can also cause test failures or indicate problems in your code. The output usually provides information about the origin of these errors, which can help in debugging.

By following these steps, you can effectively run tests, interpret the results, and address any failures to ensure the quality and correctness of your code.

## Use

1. Clone the repository:
   `git clone https://github.com/your-organization/collaborative-reality-editor.git` (update with actual repository URL)
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

### Deploy

1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Access the app at `http://localhost:3000`.

### Code

- Clear, complete, clean, compact, efficient, self-documenting ES6+ code.
- Include comments to explain complex logic or design decisions.
- Use the latest TypeScript and JavaScript language features and APIs, including:
  - Optional chaining (?.)
  - Nullish coalescing (??)
  - Ternary operators
  - Logical OR for default values
  - Arrow functions
  - Destructuring
  - Template literals
  - Inline variable declarations
  - Compact assertion syntax
  - Use const instead of let where possible
- Combine related test cases
- Use descriptive test names
- Remove redundant declarations

---

Feedback and contributions are encouraged to refine and expand the platform.
