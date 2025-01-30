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
- **Schema:** Shared schemas ensure unambiguous and multilingual meaningful exchange.
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
    - **Me:** User profile and preferences.
    - **Friends:** Status updates from connections.
    - **Network:** Peer activity and traffic visualization.
    - **Database:** Sortable, filterable data views.
- **Dark Mode:** Supported theme for visual comfort.

## Design

### Frontend

- Single-page application using TypeScript/JavaScript.
- Dynamic components for flexibility and reusability.
- `yjs` ensures real-time collaborative editing.

### Schemas

- Collection of schemas used to structure the specifics of data, messages, and UI components.

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

- `npm test` - Run all test suites
- `npm run test:core` - Core tests
- `npm run test:server` - Server tests
- `npm run test:ui` - Browser-based UI tests

## Use

1. Clone the repository:  
   `git clone https://github.com/your-organization/collaborative-reality-editor.git` (update with actual repository URL)
2. Install dependencies:  
   `npm install`
3. Start the development server:  
   `npm run dev`

### Deploy

1. Build the application:  
   `npm run build`
2. Start the production server:  
   `npm start`
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

