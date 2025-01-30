# Collaborative Reality Editor

**A platform for organizing, prioritizing, and developing ideas into actionable results through real-time collaboration, privacy-by-default, and semantic processing.**

**Target Audience:** This README is primarily intended for developers interested in contributing to the project.

**Project Status:** Early prototype. Many features are still under development or in the planning stage.

## Features

### Object Management

*   **Shared Objects:** Create, prioritize, and manage data collaboratively as `NObject`s.
*   **Thought Evolution:** `NObject`s can represent evolving ideas. Their behavior can be customized to emulate that of autonomous agents, enabling complex workflows and automation. For example, an `NObject` representing a task can automatically update its status, notify assignees, and trigger related actions based on predefined rules.
*   **Privacy by Default:** All `NObject`s are private unless explicitly shared. Privacy is enforced through end-to-end encryption and access control mechanisms that limit data access to authorized users only.

### Search and Matching

*   **Persistent Queries:** `NObject`s can act as ongoing search interests (persistent queries), actively seeking matches within the network. Users can create and manage these queries through the UI, specifying keywords, filters, and other criteria.
*   **Semantic Matching:** The platform aims to understand the meaning and intent behind `NObject`s to facilitate intelligent connections and data discovery. This is planned to be achieved using natural language processing (NLP) techniques to analyze the content and metadata of `NObject`s. The accuracy and effectiveness of semantic matching will evolve as the platform matures.
*   **Community Schema:** Shared schemas ensure multilingual meaningful exchange. The community will develop and maintain these schemas through proposals, discussions, and a voting process.
*   **Notifications:** Matches to shared `NObject`s are delivered as in-app notifications.

### P2P Networking

*   **Decentralized:**
    *   WebRTC for direct peer-to-peer communication
    *   Optional supernode implementation supporting advanced applications, large-scale coordination, and fallback.
*   **Synchronized:**
    *   `yjs` CRDT - incremental updates and offline editing.
    *   WebRTC enables direct peer-to-peer communication (text/voice/video/screensharing)
*   **Secure:**
    *   End-to-end encryption protects private data.

### User Interface

*   **Main View:** Unified interface for viewing, creating, and editing `NObject`s.
*   **Sidebar Navigation:**
    *   **Me:** User profile and preferences.
    *   **Friends:** Status updates from connections.
    *   **Network:** Peer activity and traffic visualization.
    *   **Database:** Sortable, filterable data views.
*   **Dark Mode:** Supported theme for visual comfort.

## Design

### Frontend
  - Single-page application using TypeScript/JavaScript.
  - Dynamic components for flexibility and reusability (e.g., `NObjectView`, `NObjectEditor`, `SearchBar`, `NotificationPanel`).
  - `yjs` ensures real-time collaborative editing.

### Schemas
### Schemas

- Collection of schemas used to structure the specifics of: data, messages, UI components.
- Examples:
    - `NObject`: Defines the structure of a basic `NObject` (e.g., `id`, `type`, `content`, `metadata`, `accessControl`).
    - `User`: Defines the structure of a user profile (e.g., `id`, `username`, `publicKey`, `preferences`).
    - `Message`: Defines the structure of a message exchanged between users or components (e.g., `sender`, `recipient`, `type`, `content`, `timestamp`).
- Schemas will be versioned to allow for evolution and backward compatibility.

### Server ("Supernode")
  - Node.js-based optional supernode.
  - Supernodes assist with peer discovery, data recovery, and long-term storage. They are not required for basic functionality, which can be achieved in a fully peer-to-peer manner.
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
*   **Testing Strategy:** See the `TESTING.md` file for details on the testing strategy.

## Use

1. Clone the repository: `git clone https://github.com/your-organization/collaborative-reality-editor.git` (update with actual repository URL)
2. Install dependencies: `npm install`
3. Configure the application (optional): Create a `.env` file in the root directory to set environment variables (e.g., `PORT=3000`, `SUPER_NODE_ADDRESS=...`).
4. Start the development server: `npm run dev`

### Deploy

1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Access the app at `http://localhost:3000` (the default port can be configured in the `.env` file).

### Code
  - Clear, complete, clean, compact, efficient ES6+ code.
  - Use the latest TypeScript and Javascript language features and APIs.
  - Use comments to explain complex logic or design decisions.

---

## Current Status and Future Development

- **Implemented:**
    - Basic `NObject` creation and editing.
    - Basic UI structure (Main View, Sidebar).
    - (Add more as features are implemented)
- **Planned:**
    - Real-time collaboration using `yjs`.
    - Persistent queries.
    - (Add more planned features)
- **Aspirational:**
    - Advanced semantic matching.
    - Fully autonomous agent behavior for `NObject`s.
    - (Add more long-term goals)

## Getting Started

1. **Create a new NObject:** Click the "New" button in the sidebar.
2. **Enter a title and content:** Describe your idea or task.
3. **Save the NObject:** Click the "Save" button.

## Diagrams

Architectural and data flow diagrams will be added in the future to provide a more detailed overview of the platform's design.

---

Feedback and contributions are encouraged to refine and expand the platform.

