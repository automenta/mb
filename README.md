# Collaborative Reality Editor

## Overview
  - Write, remember, and share 'thoughts'; a synchronized prioritizable multimodal "TODO list"
  - Through input, editing, and data analysis, thoughts become clarified into autonomous agents that can achieve results
  - Stores private user and public community data
  - Private objects are not shared (new objects are private)
  - '/ui' Web app for browser (offline-first)
  - '/server' supernode (Node.JS) server integrating plugin tools, networks, and serves '/ui'

## Search Paradigm
  + Shared objects can be matched, and these matches return as notifications to the user and are organized as replies-to the source object
  + Objects containing indefinite properties are like persistent partial search queries and describe 'imaginary' or hypothetical objects.  
  + Imaginary objects persist to represent and track the user's intentions, with the potential to become actually real through the network matching and suggestion process.
  + Queries in the conventional Web Search paradigm, by contrast, are weak, disposable, and ephemeral. 
  + JSON Semantic representation: Language Models can translate natural language objects to JSON to enable _semantic matching_ *at scale*.  
  + Objects may include definite and indefinite semantic values, referenced in a community schema  
    + _Definite_ - describes reality as it is.  Empirical knowledge, measurements, facts, etc. 
    + _Indefinite_ - (for queries/hypothetical/imaginary objects) describes conditions/acceptability criteria that are tested for matching real objects.

## UI
  - Main View - displays content, such as an object being viewed, or edited
  - Sidebar
    + Menu
    + Object list:  When an object is clicked, opens in view.  If user is the author, then it's editable, otherwise, it's read-only
  - Views
    + **Me**: user profile (user ID, name, icon, etc...); starts as random Anonymous.
    + **Friends**: with statuses
    + **Network**: Peers, Traffic, etc.
    + **Database**: statistics, table view (with sort and filter)
  - Dark mode (default)

# Implementation & Dependencies
  * Language: TypeScript/JavaScript (ES6+), object-oriented architecture
  * User-interface: Single dynamically-generated page
    * jQuery for DOM manipulation
    * HTML Web Components - Use strategically, but not always.  Especially for reusable, repurposable widgets.
  * Uses 'yjs' for realtime CRDT WebRTC data synchronization
  * Build: 'vite'
  * Testing: 'vitest'

# Coding
  * Code clearly, compactly, completely, and correctly.
  * Write self-documenting code with few comments.
  * Use the latest Javascript language features.
  * If possible, explore ways to generate and minimize the necessary code through clever object-oriented design and metaprogramming.