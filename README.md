Develop a collaborative document editor application for web browser HTML/JS:
- Use 'yjs' for WebRTC P2P networking and data synchronization
- Send and receive shared documents/objects from remote peers in the local database.  Private objects are not shared.
- Search Paradigm: 
  + Shared objects can be matched, and these matches return as notifications to the user and are organized as replies-to the source object
  + Objects containing indefinite properties are like persistent search queries.  But their presence can contribute significance, unlike typical ephemeral queries.
- Language models can translate objects to JSON for _semantic matching_ *at scale*.  These contain either definite or indefinite properties from a suggested description schema common to the network.
- Main View: displays a page for editing, using a live CRDT WYSIWYG Markdown text editor
- Sidebar
  + Menu
  + List of Pages:  When an item is clicked, opens in view
- Menus
  + Me: user profile (user ID, name, icon, etc...); starts as random Anonymous.
  + Friends: with statuses
  + Network: Peers, Traffic, etc.
  + Database: statistics, table view (with sort and filter)

Implementation
 * Language: "Vanilla" ES6 JavaScript, object-oriented architecture
 * User-interface: jQuery + HTML Web Components (only ONE dynamically-generated page)
 * Build setup: 'vite'

Implement the database, networking, and semi-functional user-interface, which includes all the major features, unimplemented as descriptive stubs.

Keep the code clear and compact.  Use comments sparingly, prefering self-documenting code.  Use the latest Javascript language features.  Involve no more than a few helpful common utility libraries.  If possible, find ways to generate and minimize the necessary code through clever object-oriented design and metaprogramming.

