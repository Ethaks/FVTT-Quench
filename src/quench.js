// This file is only required by the dev server
// In a production setting, Foundry loads the bundled `quench.js` file in the module's directory
// In a development setting, Vite loads `index.html` -> this file -> `quench-init.ts`
window.global = window;
import "./module/quench-init.ts";
