Develop a collaborative document editor application for web browser HTML/JS:
- Use 'yjs' for WebRTC P2P networking and data synchronization
- Send and receive shared objects from remote peers in the local database.  These become available for matching and for responding to received requests
- Main View: displays a page for editing, using a live CRDT WYSIWYG Markdown text editor
- Sidebar: List of pages.  When an item is clicked, it is opened in the view.  Also context menu for each page.
- Special Pages:
    + User profile (user ID, name, icon, etc...); starts as random Anonymous.
    + Friends list, with statuses
    + Network Status: Peers, Traffic, etc.
    + Database: statistics, table view (with sort and filter)

* Language: "Vanilla" ES6 JavaScript, object-oriented architecture
* User-interface: jQuery + HTML Web Components (only ONE dynamically-generated page)
* Build setup: 'vite'

Implement the database, networking, and semi-functional user-interface, which includes all the major features, unimplemented as descriptive stubs.

Keep the code clear and compact.  Use comments sparingly, prefering self-documenting code.  Use the latest Javascript language features.  Involve no more than a few helpful common utility libraries.  If possible, find ways to generate and minimize the necessary code through clever object-oriented design and metaprogramming.