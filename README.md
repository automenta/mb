# Collaborative Reality Editor

Organize, prioritize, and grow thoughts into actionable results. Real-time synchronization, privacy-by-default, and semantic processing.

## Features

### Thought Management
- **Shared TODO Lists:** Create, prioritize, and manage tasks collaboratively.
- **Thought Evolution:** Convert ideas into agents capable of automating and achieving goals.
- **Privacy by Default:** All objects are private unless explicitly shared.

### Search and Matching
- **Persistent Queries:** Indefinite objects act as ongoing search intents, persisting until matched with real-world data.
- **Semantic Matching:** Translates natural language into JSON for large-scale alignment.
- **Community Schema:** Shared schemas ensure consistent object interpretation.
- **Notifications:** Matches to shared objects are delivered as replies.

### P2P Networking
- **Decentralized Collaboration:**
  - Uses WebRTC for peer-to-peer communication, reducing reliance on centralized servers.
  - Supernodes optionally support large-scale coordination and fallback.
- **Efficient Synchronization:**
  - Built on `yjs` CRDT for incremental updates and offline editing.
- **Peer Discovery:**
  - Uses WebRTC signaling and other protocols and matchmaking.
- **Data Security:**
  - End-to-end encryption protects private and shared data.

### User Interface
- **Main View:** Unified interface for viewing, creating, and editing objects.
- **Sidebar Navigation:**
  - **Me:** User profile and preferences.
  - **Friends:** Status updates from connections.
  - **Network:** Peer activity and traffic visualization.
  - **Database:** Sortable, filterable statistical tables.
- **Dark Mode:** Default theme for visual comfort.

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
- **Build System:**
  - `vite` for fast development and optimized builds.
  - Modular, maintainable design.
- **Testing Strategy:**
  - Multi-layer testing: Unit, integration, and end-to-end browser tests
  - Test commands:
    - `npm test` - Run all test suites
    - `npm run test:server` - Server-side tests
    - `npm run test:ui` - Browser-based UI tests
  - Test directory structure mirrors source code (`test/` directory)

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

