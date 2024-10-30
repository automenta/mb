import './app.css';
import DB from '/src/db.js';
import Network from '/src/net.js';
import MePage from './Me.js';
 
 import * as Y from 'yjs';
@@ -400,7 +355,6 @@
         this.ytext = null;
         this.editorContainer.innerHTML = '';
     }
-
     editorStart(content) {
         const container = document.createElement('div');
         container.classList.add('editor-wrapper');
@@ -413,101 +367,6 @@
         this.editorContainer.appendChild(container);
         this.editor = editor;
         this.bindYjs();
-    }
-
-    renderStyles() {
-        const styles = document.createElement('style');
-        styles.textContent = `
-            .editor-controls {
-                padding: 12px;
-                border-bottom: 1px solid #ddd;
-                background: #f8f9fa;
-                display: flex;
-                align-items: center;
-                gap: 12px;
-            }
-            .title-input {
-                flex: 1;
-                padding: 8px;
-                font-size: 16px;
-                border: 1px solid #ddd;
-                border-radius: 4px;
-                margin-right: 12px;
-            }
-            .privacy-toggle {
-                display: flex;
-                align-items: center;
-                gap: 8px;
-            }
-            .template-buttons {
-                display: flex;
-                gap: 8px;
-            }
-            .template-button {
-                padding: 8px 12px;
-                background: #fff;
-                border: 1px solid #ddd;
-                border-radius: 4px;
-                cursor: pointer;
-                font-size: 16px;
-                transition: background-color 0.2s;
-            }
-            .template-button:hover {
-                background: #f0f0f0;
-            }
-            .toggle-switch {
-                position: relative;
-                display: inline-block;
-                width: 48px;
-                height: 24px;
-            }
-            .toggle-switch input {
-                opacity: 0;
-                width: 0;
-                height: 0;
-            }
-            .toggle-slider {
-                position: absolute;
-                cursor: pointer;
-                top: 0;
-                left: 0;
-                right: 0;
-                bottom: 0;
-                background-color: #ccc;
-                transition: 0.4s;
-                border-radius: 24px;
-            }
-            .toggle-slider:before {
-                position: absolute;
-                content: "";
-                height: 18px;
-                width: 18px;
-                left: 3px;
-                bottom: 3px;
-                background-color: white;
-                transition: 0.4s;
-                border-radius: 50%;
-            }
-            input:checked + .toggle-slider {
-                background-color: #2196F3;
-            }
-            input:checked + .toggle-slider:before {
-                transform: translateX(24px);
-            }
-            .toolbar {
-                display: flex;
-                gap: 8px;
-                padding: 8px;
-                background: #f1f1f1;
-                border-bottom: 1px solid #ccc;
-            }
-            .toolbar button {
-                background: none;
-                border: none;
-                cursor: pointer;
-                padding: 8px;
-                font-size: 16px;
-                border-radius: 4px;
-                transition: background-color 0.2s;
-            }
-            .toolbar button:hover {
-                background-color: #e0e0e0;
-            }
-            .editor {
-                flex: 1;
-                padding: 16px;
-                outline: none;
-                overflow-y: auto;
-                min-height: 300px;
-            }
-        `;
-        this.shadowRoot.appendChild(styles);
     }
 
     controlSection(pageId) {

