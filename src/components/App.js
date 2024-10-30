--- a/src/components/App.js
+++ b/src/components/App.js
@@ -1,7 +1,7 @@
 import './app.css';
 import DB from '/src/db.js';
 import Network from '/src/net.js';
-import { editorStyles } from './editorStyles.js';
+import { editorStyles } from './editorStyles.js'; 
 import MePage from './Me.js';
  
  import * as Y from 'yjs';
@@ -101,7 +101,7 @@
         this.ytext = null;
         this.editorContainer.innerHTML = '';
     }
-    editorStart(content, isPrivate) {
+    editorStart(content, isPrivate = false) {
         const container = document.createElement('div');
         container.classList.add('editor-wrapper');
         container.classList.add('editor-wrapper-private');

