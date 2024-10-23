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



----

Design an HTML/JS text input widget with the following feature:

Upon saving, it converts the text into a JSON object, through Language Model prompting, in order to enable semantic processing of quantifiable and qualitative description content.  This internal representation can be shown in a summary, for user's disclosure and correction.  It will call an OpenAI-compatible JSON endpoint, running on localhost, by populating the request's system-prompt with to-be-developed JSONize instructions, and the prompt with the text.  Quick linting of the parse for extraneous text above and below the parseable JSON { } may need to be removed.

Make a smoothly flowing user-experience.  Provide unobtrusive feedback that will help the developers and users know what is happening.

Don't assume anything important!  If you have questions, ask me before writing code that could be wrong.

Write one .html file containing a complete working demo.

Keep the design as simple as possible, without limiting its potential for growth. Avoid overengineering and avoid excessively verbose/pedantic identifiers and design patterns.  Keep the code clear and compact.  Use comments sparingly, prefering self-documenting code.  Use the latest Javascript language features.  Involve no more than a few helpful common utility libraries.  If possible, find ways to generate and minimize the necessary code through clever object-oriented design and metaprogramming.

----

Design an HTML/JS "TODO List" application that includes all expected functionality, including data saving (in the browser).
- No need for a 'completion state' toggle.  Just a small delete 'x' button, with confirmation.
- Use IndexedDB through an appropriate DB library, like PouchDB or something better.
- Allow changing the item order by drag and drop
- Abstract generic widgets that can be flexibly applied in other ways than this prototype requires

Make a smoothly flowing user-experience.  Provide unobtrusive feedback that will help the developers and users know what is happening.  Carefully organize the components and the structure of the event handling for clarity and extensibility.

Write one .html file containing a complete working demo.

Keep the design as simple as possible, without limiting its potential for growth. Avoid overengineering and avoid excessively verbose/pedantic identifiers and design patterns.  Keep the code clear and compact.  Use comments sparingly, prefering self-documenting code.  Use the latest Javascript language features.  Involve no more than a few helpful common utility libraries.  If possible, find ways to generate and minimize the necessary code through clever object-oriented design and metaprogramming.

----

Apply software development insight and wisdom to integrate the included web application components into a complete cohesive web application focused in a Personal TODO List.

Refactor the user-interface into more cohesive and conventional experience. Identify missing potential integration points between components that will enhance functionality and value.

Each item can asynchronously accumulate replies from semantically matched content.  The purpose of the JSON representation is to enable matching at scale.  This entire process can happen automatically and transparently as a result of simply saving an item.  JSON view can be toggled on, shown in an editable textarea, allowing a manual override.

Style/UX: minimalistic, beautiful, does not waste white space, prefer larger fonts, built-in emoticon icons.

Network state visualized in a corner icon with an icon state and optional animated blinking lights.  Quick-add peer input, and quick "copy my peerID" to share.

Include user profile editor.  When displaying peers, include their name.

Retain the 'vanilla' ES6 JavaScript code patterns we are currently using.  Do not introduce extra libraries without extreme justification.  DO NOT use React.

Keep the design as simple as possible, without limiting its potential for growth. Avoid overengineering and avoid excessively verbose/pedantic identifiers and design patterns.  Keep the code clear and compact.  Use comments sparingly, prefering self-documenting code.  Use the latest Javascript language features.  Involve no more than a few helpful common utility libraries.  If possible, find ways to generate and minimize the necessary code through clever object-oriented design and metaprogramming.

