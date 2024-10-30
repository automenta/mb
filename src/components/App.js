import '/style.css';
import DB from '/src/db.js';
import Network from '/src/net.js';
import MePage from './Me.js';
 
 import * as Y from 'yjs';
@@ -108,7 +108,7 @@
         addPageButton.addEventListener('click', () => {
             const pageId = `page-${Date.now()}`;
             this.db.pageNew(pageId, 'Empty', false);
-            this.app.editor.viewPage(pageId);
+            this.app.editor.viewPage(pageId); 
         });
         menuBar.appendChild(addPageButton);
 
@@ -480,7 +480,7 @@
             ul { list-style: none; padding: 0; margin: 0; }
             li { padding: 8px; cursor: pointer; border-bottom: 1px solid #eee; }
             li:hover { background: #f5f5f5; }
-            .menubar {
+            .menubar { 
                 display: flex;
                 gap: 10px;
                 margin-bottom: 10px;

