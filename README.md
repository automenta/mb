# Collaborative Reality Editor

Organize, prioritize, and grow thoughts into actionable results. Real-time synchronization, privacy-by-default, and semantic processing.

## Features

### Object Management

*   **Shared Objects:** Create, prioritize, and manage data collaboratively as `NObject`s.
*   **Thought Evolution:** `NObject`s can represent evolving ideas, with their behavior emulating that of autonomous agents, enabling complex workflows and automation.
*   **Privacy by Default:** All `NObject`s are private unless explicitly shared.

### Search and Matching

*   **Persistent Queries:** `NObject`s can act as ongoing search interests (persistent queries), actively seeking matches within the network.
*   **Semantic Matching:** The platform aims to understand the meaning and intent behind `NObject`s to facilitate intelligent connections and data discovery.
*   **Community Schema:** Shared schemas (under development) will ensure consistent object interpretation across the network.
*   **Notifications:** Matches to shared `NObject`s are delivered as replies.

### P2P Networking

*   **Decentralized Collaboration:**
    *   Uses WebRTC for direct peer-to-peer communication, reducing reliance on centralized servers.
    *   Optional supernode implementation (work in progress) to support large-scale coordination and fallback.
*   **Efficient Synchronization:**
    *   Built on `yjs` CRDT for incremental updates and offline editing.
*   **Peer Discovery:**
    *   Uses WebRTC signaling and other protocols for peer discovery and matchmaking.
*   **Data Security:**
    *   End-to-end encryption is planned to protect private and shared data.

### User Interface

*   **Main View:** Unified interface for viewing, creating, and editing `NObject`s.
*   **Sidebar Navigation:**
    *   **Me:** User profile and preferences.
    *   **Friends:** Status updates from connections (under development).
    *   **Network:** Peer activity and traffic visualization (under development).
    *   **Database:** Sortable, filterable statistical tables of `NObject`s.
*   **Dark Mode:** Supported theme for visual comfort.

## Design

### Frontend
  - Single-page application using TypeScript/JavaScript.
  - Dynamic components for flexibility and reusability.
  - `yjs` ensures real-time collaborative editing.

### Schemas
- Collection of schemas used to structure the specifics of: data, messages, UI components
- **Registry:** Central schema registry manages versioning and dependencies
- **Type Safety and Validation:** TypeScript interfaces generated from schemas ensure type correctness and enforce data structure consistency 

### Network
- **Synchronization:**
  - WebRTC enables direct peer-to-peer communication.
  - Incremental delta synchronization ensures low-latency updates.
- **Fallback Coordination:**
  - Supernodes assist with recovery and long-term storage.
- **Security:**
  - Encrypted transmission and fine-grained access controls.

### Backend
  - Node.js-based optional supernode
  - WebSocket connection to served UI client providing client with additional functionality
  - Network
    - UDP Gossip Protocol
    - BitTorrent DHT - bootstrap
    - LibP2P - bootstrap
    - ...
  - Database  
    - In-memory caching + persistent storage, for durability and scalability.
    - LevelDB
    - IPFS - decentralized storage
    - ...
  - Plugins    
    - Input
      - Screenshot
      - ...
    - Analysis
      - OCR
      - ...  

### Implementation

*   **Build System:**
    *   `vite` for fast development and optimized builds.
    *   Modular, maintainable design.
*   **Testing Strategy:**
    *   Multi-layer testing is planned:
        *   Unit tests for individual components.
        *   Integration tests for interactions between components.
        *   End-to-end browser tests for UI and user flows.
    *   Test commands (planned):
        *   `npm test` - Run all test suites.
        *   `npm run test:server` - Run server-side tests.
        *   `npm run test:ui` - Run browser-based UI tests.
    *   Test directory structure will mirror the source code (`test/` directory).

## Usage

1. Clone the repository: `git clone https://github.com/your-organization/collaborative-reality-editor.git` (update with actual repository URL)
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

### Deployment

1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Access the app at `http://localhost:3000`.

### Code
  - Clear, complete, clean, compact, efficient, self-documenting ES6+ code.
  - Use the latest TypeScript and Javascript language features and APIs
  - Use comments only if code does not self-document

---

Feedback and contributions are encouraged to refine and expand the platform.

