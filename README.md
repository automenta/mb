A TODO-List application which uses a Language Model to generate machine-readable JSON objects from the text.  Then these documents are shared in a p2p network (gossip protocol) for searching and matching.
* Items: Creation, Editing, and Deleting
* Listing: filter, and sort by date or tags
* Search: a search is a reified TODO item to which results, locally AND network (results can stream in at any time), are 'attached' in a reply-to way

The purpose of converting TODO items to JSON objects is to facilitate semantic matching of objects, at scale.  Object tags (of which there may be >=0) provide a divide-and-conquer approach to the quadratic combinations.

Create the project and a top-level skeleton that integrates all the components and their interactions.

* Language: "Vanilla" ES6 JavaScript, object-oriented architecture
* User-interface: jQuery + HTML Web Components (1 dynamically-generated page)
* Build setup: 'vite'

Keep the design as simple as possible, without limiting its potential for growth. Avoid overengineering and avoid excessively verbose/pedantic identifiers and design patterns.  Keep the code clear and compact.  Use comments sparingly, prefering self-documenting code.  Use the latest Javascript language features.  Involve no more than a few helpful common utility libraries.  If possible, find ways to generate and minimize the necessary code through clever object-oriented design and metaprogramming.