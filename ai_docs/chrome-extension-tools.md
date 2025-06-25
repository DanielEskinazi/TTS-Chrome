TITLE: Define Chrome Extension Manifest
DESCRIPTION: Create `manifest.json` next to `vite.config.js` to define the basic properties of the Chrome Extension, including manifest version, name, version, and the default popup page.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/solid/00-create-project.md#_snippet_3

LANGUAGE: json
CODE:

```
{
  "manifest_version": 3,
  "name": "CRXJS Solid Vite Example",
  "version": "1.0.0",
  "action": { "default_popup": "index.html" }
}
```

---

TITLE: Configure Vite for CRXJS
DESCRIPTION: Creates or updates `vite.config.js` to integrate the CRXJS plugin. This configuration imports `defineConfig` from Vite and `crx` from the plugin, linking it to the `manifest.json` file for extension bundling.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vanilla-js/00-create-project.md#_snippet_1

LANGUAGE: js
CODE:

```
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [crx({ manifest })],
})
```

---

TITLE: Defining Chrome Extension Manifest with defineManifest in TypeScript
DESCRIPTION: This TypeScript example demonstrates how to use `@crxjs/vite-plugin`'s `defineManifest` helper to create a Chrome Extension manifest. It dynamically sets the extension name based on Vite's environment mode and derives the version from `package.json`, converting it to the Chrome Extension version format. This approach provides autocompletion and supports dynamic or asynchronous definitions.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/00-manifest.md#_snippet_0

LANGUAGE: typescript
CODE:

```
import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from './package.json'
const { version } = packageJson

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch, label = '0'] = version
  // can only contain digits, dots, or dash
  .replace(/[^\d.-]+/g, '')
  // split into version parts
  .split(/[.-]/)

export default defineManifest(async (env) => ({
  manifest_version: 3,
  name:
    env.mode === 'staging'
      ? '[INTERNAL] CRXJS Power Tools'
      : 'CRXJS Power Tools',
  // up to four numbers separated by dots
  version: `${major}.${minor}.${patch}.${label}`,
  // semver is OK in "version_name"
  version_name: version,
}))
```

---

TITLE: Run Chrome Extension Development Build
DESCRIPTION: Execute the development command to start the Vite build process for the Chrome Extension. This command initiates the development server and prepares the extension for loading in the browser.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/solid/00-create-project.md#_snippet_4

LANGUAGE: sh
CODE:

```
npm run dev
```

---

TITLE: Run Development Build Command
DESCRIPTION: Executes the `npm run dev` command to start the development server and build the Chrome Extension.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vue/00-create-project.md#_snippet_3

LANGUAGE: sh
CODE:

```
npm run dev
```

---

TITLE: Define Chrome Extension Manifest
DESCRIPTION: Creates `manifest.json` to define the Chrome Extension's core properties, including API version, name, version, and the default popup page entry point (`index.html`).
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/react/00-create-project.md#_snippet_1

LANGUAGE: json
CODE:

```
{
  "manifest_version": 3,
  "name": "CRXJS React Vite Example",
  "version": "1.0.0",
  "action": { "default_popup": "index.html" }
}
```

---

TITLE: Define Chrome Extension Manifest
DESCRIPTION: Creates the `manifest.json` file, which is essential for defining the Chrome Extension's properties. This example sets manifest version 3, the extension's name, version, and specifies `index.html` as the default popup page.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vanilla-js/00-create-project.md#_snippet_2

LANGUAGE: json
CODE:

```
{
  "manifest_version": 3,
  "name": "CRXJS Vanilla JS Example",
  "version": "1.0.0",
  "action": { "default_popup": "index.html" }
}
```

---

TITLE: Create Chrome Extension Manifest File
DESCRIPTION: Creates a `manifest.json` file for the Chrome Extension, defining its version, name, and the default popup HTML page.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vue/00-create-project.md#_snippet_2

LANGUAGE: json
CODE:

```
{
  "manifest_version": 3,
  "name": "CRXJS Vue Vite Example",
  "version": "1.0.0",
  "action": { "default_popup": "index.html" }
}
```

---

TITLE: Configure Chrome Extension Service Worker in manifest.json
DESCRIPTION: This JSON snippet demonstrates how to configure a service worker for a Chrome Extension within the `manifest.json` file. It specifies the path to the service worker script (`src/background.ts`) and sets its type to `module`, which is required for CRXJS and Vite compatibility.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/02-background.md#_snippet_0

LANGUAGE: JSON
CODE:

```
{
  "background": {
    "service_worker": "src/background.ts",
    "type": "module"
  }
}
```

---

TITLE: Install CRXJS Vite Plugin
DESCRIPTION: Installs the `@crxjs/vite-plugin` as a development dependency using npm, enabling CRXJS functionalities in your Vite project.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/react/00-create-project.md#_snippet_0

LANGUAGE: sh
CODE:

```
npm install --save-dev @crxjs/vite-plugin@beta
```

---

TITLE: Declare content script in manifest.json
DESCRIPTION: This JSON snippet shows how to declare a content script in the `manifest.json` file of a Chrome Extension. It specifies the JavaScript file (`src/content.js`) to be executed and the match patterns (`https://www.google.com/*`) where the script should run.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vanilla-js/02-add-content-script.md#_snippet_0

LANGUAGE: json
CODE:

```
{
  // other fields...
  "content_scripts": [
    {
      "js": ["src/content.js"],
      "matches": ["https://www.google.com/*"]
    }
  ]
}
```

---

TITLE: Configure Content Script in manifest.json
DESCRIPTION: This JSON snippet demonstrates how to declare a content script in `manifest.json`. It specifies the JavaScript file (`src/content.jsx`) to be executed and the match patterns (`https://www.google.com/*`) for the web pages where the script should run.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/solid/02-add-content-script.md#_snippet_0

LANGUAGE: json
CODE:

```
{
  // other fields...
  "content_scripts": [
    {
      "js": ["src/content.jsx"],
      "matches": ["https://www.google.com/*"]
    }
  ]
}
```

---

TITLE: Initialize New Project with Vite for CRXJS
DESCRIPTION: Use your preferred package manager to scaffold a new project with Vite, specifying the desired version. This process guides you through creating a project compatible with CRXJS development. Note that CRXJS support for Vite 3 is currently in beta. For React users, it's recommended to use `@vitejs/plugin-react` instead of `@vite/plugin-react-swc` due to HMR incompatibility with CRXJS.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/_create-project-tabs.mdx#_snippet_0

LANGUAGE: Shell
CODE:

```
npm init vite@^2.9.4
```

LANGUAGE: Shell
CODE:

```
npm init vite@latest
```

---

TITLE: Inject Extension HTML Page via Iframe
DESCRIPTION: This code shows how to inject an extension-specific HTML page into a host page using an iframe. The injected iframe operates cross-origin, meaning it doesn't access the host page DOM but retains full access to the Chrome API. This method is useful for rendering complex UI elements.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/03-content-scripts.md#_snippet_1

LANGUAGE: javascript
CODE:

```
const src = chrome.runtime.getURL('pages/iframe.html')

const iframe = new DOMParser().parseFromString(
  `<iframe class="crx" src="${src}"></iframe>`,
).body.firstElementChild

document.body.append(iframe)
```

---

TITLE: Declare Content Script in Chrome Extension Manifest
DESCRIPTION: This JSON snippet illustrates how to configure a content script within the `manifest.json` file of a Chrome Extension. It specifies the JavaScript file (`src/content.jsx`) that Chrome should execute and the URL patterns (`https://www.google.com/*`) on which the script will run.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/react/02-add-content-script.md#_snippet_0

LANGUAGE: json
CODE:

```
{
  // other fields...
  "content_scripts": [
    {
      "js": ["src/content.jsx"],
      "matches": ["https://www.google.com/*"]
    }
  ]
}
```

---

TITLE: Declare Vue Content Script in manifest.json
DESCRIPTION: Configures the `manifest.json` file to declare a content script. It specifies `src/content.js` as the JavaScript file to be executed and `https://www.google.com/*` as the match pattern for pages where the script should run.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vue/02-add-content-script.md#_snippet_0

LANGUAGE: JSON
CODE:

```
{
  // other fields...
  "content_scripts": [
    {
      "js": ["src/content.js"],
      "matches": ["https://www.google.com/*"]
    }
  ]
}
```

---

TITLE: Solid.js Content Script with Dynamic Root Element Creation
DESCRIPTION: This JSX code provides the corrected Solid.js content script (`src/content.jsx`) that dynamically creates a root `div` element (`crx-root`), appends it to the document body, and then mounts the Solid application to this newly created element. This ensures the Solid app has a valid DOM target in a content script environment.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/solid/02-add-content-script.md#_snippet_2

LANGUAGE: jsx
CODE:

```
import { render } from 'solid-js/web';

import './index.css';
import App from './App';

// highlight-start
const root = document.createElement('div')
root.id = 'crx-root'
document.body.append(root)
// highlight-end

render(
  () => <App />,
  // highlight-next-line
  root
);
```

---

TITLE: Get Extension URL for Static Assets
DESCRIPTION: Content scripts share the origin of the host page. This snippet demonstrates how to convert imported static assets, like images, to the extension's origin using `chrome.runtime.getURL()`, making them accessible within the content script.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/03-content-scripts.md#_snippet_0

LANGUAGE: javascript
CODE:

```
import logo from './logo.png'
const url = chrome.runtime.getURL(logo)
```

---

TITLE: Applying Scoped CSS for Content Scripts
DESCRIPTION: This CSS snippet addresses style leakage issues where the host page's CSS affects content script elements and vice-versa. By targeting the '#crx-root' element, it scopes styles to the content script's root and applies specific styling to buttons within it, ensuring visual consistency and preventing unintended style conflicts.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/react/03-dev-content-script.md#_snippet_0

LANGUAGE: css
CODE:

```
#crx-root {
  position: fixed;
  top: 3rem;
  left: 50%;
  transform: translate(-50%, 0);
}

#crx-root button {
  background-color: rgb(239, 239, 239);
  border-color: rgb(118, 118, 118);
  border-image: initial;
  border-style: outset;
  border-width: 2px;
  margin: 0;
  padding: 1px 6px;
}
```

---

TITLE: Fixing CSS style leakage in content scripts
DESCRIPTION: This CSS snippet scopes the styles for the content script's root element (`#crx-root`) and its child button, preventing style conflicts with the host page. It ensures the content script's UI elements maintain their intended appearance.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vue/03-dev-content-script.md#_snippet_0

LANGUAGE: css
CODE:

```
#crx-root {
  position: fixed;
  top: 3rem;
  left: 50%;
  transform: translate(-50%, 0);
}

#crx-root button {
  background-color: rgb(239, 239, 239);
  border-color: rgb(118, 118, 118);
  border-image: initial;
  border-style: outset;
  border-width: 2px;
  margin: 0;
  padding: 1px 6px;
}
```

---

TITLE: Declare Web Accessible Resources for HTML Pages
DESCRIPTION: When an HTML file is loaded from a content script, it must be declared as a web-accessible resource in the `manifest.json`. This configuration specifies which resources are available to web pages and under what conditions, ensuring the browser can load the injected HTML.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/03-content-scripts.md#_snippet_2

LANGUAGE: json
CODE:

```
{
  "web_accessible_resources": [
    {
      "resources": ["pages/iframe.html"],
      "matches": ["https://*.google.com/*"]
    }
  ]
}
```

---

TITLE: Configure Web Accessible Resources in manifest.json
DESCRIPTION: To allow content scripts to access images and other resources, they must be declared in the `web_accessible_resources` field of your `manifest.json` file. This example shows how to make PNG icons accessible to content scripts.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/common/_get-url-for-images.mdx#_snippet_0

LANGUAGE: json
CODE:

```
"web_accessible_resources": [
  {
    "resources": [ "icons/*.png"],
    "matches": []
  }
]
```

---

TITLE: Apply Scoped CSS Styles for Solid Content Script
DESCRIPTION: This CSS snippet provides specific styles for the content script's root element (`#crx-root`) and its buttons. It aims to fix styling issues caused by host page CSS leakage, ensuring the content script's UI elements render correctly and independently.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/solid/03-dev-content-script.md#_snippet_1

LANGUAGE: css
CODE:

```
#crx-root {
  position: fixed;
  top: 3rem;
  left: 50%;
  transform: translate(-50%, 0);
}

#crx-root button {
  background-color: rgb(239, 239, 239);
  border-color: rgb(118, 118, 118);
  border-image: initial;
  border-style: outset;
  border-width: 2px;
  margin: 0;
  padding: 1px 6px;
}
```

---

TITLE: Inject HTML Content into Document Body (JavaScript)
DESCRIPTION: This JavaScript code imports assets and constructs an HTML string containing a 'div' with an 'h1' tag and an image. It then parses this string and appends the resulting element to the document's body. This example illustrates how to dynamically add content to a page via a content script and observes Vite's HMR behavior for JavaScript, which triggers a full page reload for vanilla JS.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vanilla-js/03-dev-content-script.md#_snippet_1

LANGUAGE: javascript
CODE:

```
import logo from './crxjs-logo.png'
import './content.css'

const html = `
<div class="crx">
  <h1>Made with</h1>
  <img src=${logo}>
</div>
`

const doc = new DOMParser().parseFromString(html, 'text/html')
document.body.append(doc.body.firstChildElement)
```

---

TITLE: Configure Vite for CRXJS and React
DESCRIPTION: Updates `vite.config.js` to import and use `@vitejs/plugin-react` for React support and `@crxjs/vite-plugin` for Chrome Extension specific build processes, linking to `manifest.json`.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/react/00-create-project.md#_snippet_2

LANGUAGE: js
CODE:

```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// highlight-start
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
// highlight-end

export default defineConfig({
  plugins: [
    react(),
    // highlight-next-line
    crx({ manifest })
  ]
})
```

---

TITLE: Manually Create and Mount Vue Root in Content Script
DESCRIPTION: Provides the correct method for mounting a Vue application within a Chrome Extension content script. It shows how to programmatically create a `div` element (`#crx-root`), append it to the document body, and then mount the Vue application to this newly created root.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vue/02-add-content-script.md#_snippet_2

LANGUAGE: JavaScript
CODE:

```
import { createApp } from 'vue'
import App from './App.vue'

// highlight-start
const root = document.createElement('div')
root.id = 'crx-root'
document.body.append(root)
// highlight-end

const app = createApp(App)
// highlight-next-line
app.mount(root)
```

---

TITLE: React Content Script: Creating and Rendering into Dynamic Root
DESCRIPTION: These snippets provide the complete implementation for a React content script, demonstrating how to dynamically create a root `div` element (`crx-root`), append it to the `document.body`, and then render the React application into this newly created element. Both React 17 (`ReactDOM.render`) and React 18+ (`ReactDOM.createRoot`) methods are shown for compatibility.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/react/02-add-content-script.md#_snippet_2

LANGUAGE: jsx
CODE:

```
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

// highlight-start
const root = document.createElement('div')
root.id = 'crx-root'
document.body.append(root)
// highlight-end

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  // highlight-next-line
  root,
)
```

LANGUAGE: jsx
CODE:

```
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// highlight-start
const root = document.createElement("div");
root.id = "crx-root";
document.body.appendChild(root);
// highlight-end

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

TITLE: Create a New Vite Project for Chrome Extension
DESCRIPTION: Scaffold a new Solid.js project using `degit` as the base for a Chrome Extension popup page, with options for JavaScript or TypeScript templates.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/solid/00-create-project.md#_snippet_0

LANGUAGE: sh
CODE:

```
npx degit solidjs/templates/js vite-solid-crxjs
```

LANGUAGE: sh
CODE:

```
npx degit solidjs/templates/ts vite-solid-crxjs
```

---

TITLE: Add visual element with vanilla JavaScript content script
DESCRIPTION: This JavaScript code for `src/content.js` demonstrates how to add a visual element (CRXJS logo) to the host page using plain JavaScript. It imports an image and a CSS file, constructs HTML, and appends it to the document body, showcasing Vite's ability to handle assets in content scripts.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vanilla-js/02-add-content-script.md#_snippet_1

LANGUAGE: javascript
CODE:

```
import src from './image.png'
import './content.css'

const html = `
<div class="crx">
  <img src=${src}>
</div>
`

const doc = new DOMParser().parseFromString(html, 'text/html')
document.body.append(doc.body.firstElementChild)
```

---

TITLE: Import HTML as Raw Text in Content Scripts
DESCRIPTION: This technique allows importing an HTML file as a static text fragment using the `?raw` query. It's suitable for rendering complex HTML without a framework and avoids the need for `web_accessible_resources` declaration or Vite input configuration, offering a more concise approach than `document.createElement()`.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/03-content-scripts.md#_snippet_4

LANGUAGE: javascript
CODE:

```
import html from './root.html?raw'

const iframe = new DOMParser().parseFromString(html).body.firstElementChild
iframe.src = chrome.runtime.getURL('pages/iframe.html')

document.body.append(iframe)
```

---

TITLE: Configure Vite for CRXJS and Vue
DESCRIPTION: Updates the `vite.config.js` file to integrate the CRXJS Vite plugin and the Vue plugin. It imports the `crx` function and the `manifest.json` file, then adds the `crx` plugin to the Vite configuration.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vue/00-create-project.md#_snippet_1

LANGUAGE: js
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// highlight-start
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' // Node 14 & 16
import manifest from './manifest.json' assert { type: 'json' } // Node >=17
// highlight-end

export default defineConfig({
  plugins: [
    vue(),
    // highlight-next-line
    crx({ manifest })
  ]
})
```

---

TITLE: Configure Extra HTML Pages in Vite
DESCRIPTION: This configuration snippet demonstrates how to declare additional HTML pages, such as a welcome page, in a CRXJS extension using Vite's `build.rollupOptions.input`. These pages will be served during development with HMR and optimized for production builds.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/01-pages.md#_snippet_0

LANGUAGE: javascript
CODE:

```
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        welcome: 'pages/welcome.html',
      },
    },
  },
})
```

---

TITLE: Configure Vite for CRXJS
DESCRIPTION: Update `vite.config.js` to import and use the CRXJS Vite plugin, integrating it with Solid.js. This configuration is essential for CRXJS to process the extension's assets.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/solid/00-create-project.md#_snippet_2

LANGUAGE: js
CODE:

```
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    solidPlugin(),
    crx({ manifest })
  ]
})
```

---

TITLE: Initialize Rollup Chrome Extension Plugin
DESCRIPTION: Example `rollup.config.js` showing how to import and use the `chromeExtension` plugin. It sets the input to `src/manifest.json` and output to `dist` with `esm` format.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/rollup-plugin/API.md#_snippet_1

LANGUAGE: javascript
CODE:

```
// rollup.config.js

import { chromeExtension } from 'rollup-plugin-chrome-extension'

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm'
  },
  plugins: [chromeExtension()]
}
```

---

TITLE: Correct Relative Paths in Chrome Extension Manifest JSON
DESCRIPTION: This JSON example illustrates the correct way to specify paths for `options_page` and `devtools_page` within a Chrome Extension manifest. Paths should be relative to the Vite project root and start with a letter, ensuring proper resolution by CRXJS.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/00-manifest.md#_snippet_1

LANGUAGE: json
CODE:

```
{
  "options_page": "options.html",
  "devtools_page": "pages/devtools.html"
}
```

---

TITLE: Configuring Web Accessible Resources in Manifest
DESCRIPTION: Example `manifest.json` snippet showing how to declare various types of web accessible resources, including specific files, HTML files, and using globs for image files.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/rollup-plugin/API.md#_snippet_9

LANGUAGE: json
CODE:

```
{
  "web_accessible_resources": [
    "fonts/some_font.oft",
    // HTML files are parsed like any other HTML file.
    "options2.html",
    // Globs are supported too!
    "**/*.png"
  ]
}
```

---

TITLE: React App Initial Render (Before Dynamic Root Creation)
DESCRIPTION: These code examples demonstrate the standard entry points for rendering a React application, showcasing both React 17 (`ReactDOM.render`) and React 18+ (`ReactDOM.createRoot`) approaches. They highlight that in a content script context, the target DOM element (e.g., `document.getElementById('root')`) typically needs to be manually created and appended to the document body before the React app can be mounted.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/react/02-add-content-script.md#_snippet_1

LANGUAGE: jsx
CODE:

```
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  // highlight-start
  // this element doesn't exist
  document.getElementById('root'),
  // highlight-end
)
```

LANGUAGE: jsx
CODE:

```
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from './App'

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
     <App />
  </React.StrictMode>
);
```

---

TITLE: Standard Vue App Mounting (Not for Content Scripts)
DESCRIPTION: Illustrates a typical Vue application's entry point (`src/main.js`) where the app is mounted to an existing HTML element with the ID `#app`. This approach is generally not suitable for content scripts as they lack a dedicated HTML file.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vue/02-add-content-script.md#_snippet_1

LANGUAGE: JavaScript
CODE:

```
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)
// highlight-start
// this element doesn't exist
app.mount('#app')
// highlight-end
```

---

TITLE: Configure Simple Reloader for Rollup Chrome Extension
DESCRIPTION: Example `rollup.config.js` demonstrating how to integrate `simpleReloader` with `chromeExtension`. The reloader should be placed after the main plugin in the plugins array to enable auto-reloading during watch mode.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/rollup-plugin/API.md#_snippet_3

LANGUAGE: javascript
CODE:

```
import { chromeExtension, simpleReloader } from 'rollup-plugin-chrome-extension'

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm'
  },
  plugins: [
    chromeExtension(),
    // Reloader goes after the main plugin
    simpleReloader()
  ]
}
```

---

TITLE: Manifest API: web_accessible_resources Field Configuration
DESCRIPTION: Defines files that are not imported by scripts but need to be accessible by web pages or other extension contexts. Supports relative paths and glob patterns.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/rollup-plugin/API.md#_snippet_8

LANGUAGE: APIDOC
CODE:

```
Manifest Field: web_accessible_resources
  Type: string[]
  Description: An array of paths to resources that should be accessible by web pages or scripts.
  Usage: For files not imported directly or referenced in HTML/manifest.
  Output Behavior: Written to output.dir maintaining source folder structure.
  Constraint: Relative paths cannot lead outside the source folder.
  Supports: Globs (e.g., "**/*.png")
```

---

TITLE: Manifest API: Permissions Field Configuration
DESCRIPTION: Describes how to manage the `permissions` array in `manifest.json`, including a method to exclude unwanted permissions by prefixing them with `!`.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/rollup-plugin/API.md#_snippet_4

LANGUAGE: APIDOC
CODE:

```
Manifest Field: permissions
  Type: string[]
  Description: An array of strings defining the permissions required by the extension.
  Exclusion Method: Prefix unwanted permissions with "!" in the source manifest.json to prevent them from being included in the output manifest.
  Example (Source): {"permissions": ["!alarms", "storage"]}
  Example (Output): {"permissions": ["storage"]}
```

---

TITLE: Run First Development Build for Chrome Extension
DESCRIPTION: Executes the `npm run dev` command to start the development server, building the Chrome Extension with hot module replacement enabled by Vite and CRXJS.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/react/00-create-project.md#_snippet_3

LANGUAGE: sh
CODE:

```
npm run dev
```

---

TITLE: Install CRXJS Vite Plugin
DESCRIPTION: Installs the CRXJS Vite plugin as a development dependency using npm.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vue/00-create-project.md#_snippet_0

LANGUAGE: sh
CODE:

```
npm install --save-dev @crxjs/vite-plugin@beta
```

---

TITLE: Install CRXJS Vite Plugin
DESCRIPTION: Installs the `@crxjs/vite-plugin` as a development dependency using npm, enabling CRXJS functionalities within a Vite project.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vanilla-js/00-create-project.md#_snippet_0

LANGUAGE: sh
CODE:

```
npm install --save-dev @crxjs/vite-plugin@beta
```

---

TITLE: Start CRXJS Development Server
DESCRIPTION: Execute this command in your terminal to start the Vite development server for your CRXJS project. This is a prerequisite for testing your extension in the browser.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/_dev-basics-intro.md#_snippet_0

LANGUAGE: sh
CODE:

```
npm run dev
```

---

TITLE: API Export: chromeExtension Function
DESCRIPTION: Initializes the `rollup-plugin-chrome-extension`. This function should always be the first plugin in the Rollup plugins array as it processes the manifest.json into input files.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/rollup-plugin/API.md#_snippet_0

LANGUAGE: APIDOC
CODE:

```
Function: chromeExtension
  Type: function
  Signature: (options?: object) => ChromeExtensionPlugin
  Description: Initializes the plugin. Converts manifest.json to an array of input files.
  Placement: Must be the first plugin in the Rollup plugins array.
```

---

TITLE: Install CRXJS Vite Plugin
DESCRIPTION: Install the CRXJS Vite plugin as a development dependency using npm. This plugin enables Chrome Extension development features within Vite.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/solid/00-create-project.md#_snippet_1

LANGUAGE: sh
CODE:

```
npm i @crxjs/vite-plugin@beta -D
```

---

TITLE: Run Development Server
DESCRIPTION: Executes the development command, typically `npm run dev`, to start the Vite development server. This command enables hot module replacement (HMR) for CSS and full page reloads for JavaScript changes during development.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/getting-started/vanilla-js/00-create-project.md#_snippet_3

LANGUAGE: sh
CODE:

```
npm run dev
```

---

TITLE: Configuring VSCode for Chrome Manifest JSON Schema Autocompletion
DESCRIPTION: This JSON snippet shows how to configure VSCode's `settings.json` to enable autocompletion and validation for `manifest.json` files. By linking to the `chrome-manifest.json` schema from JSON Schema Store, developers can benefit from enhanced development experience.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/00-manifest.md#_snippet_3

LANGUAGE: json
CODE:

```
{
  "json.schemas": [
    {
      "fileMatch": ["manifest.json"],
      "url": "https://json.schemastore.org/chrome-manifest.json"
    }
  ]
}
```

---

TITLE: Configure Vite Input for Extension HTML Pages
DESCRIPTION: For HTML files loaded from a content script, they also need to be added to the Vite configuration under `build.rollupOptions.input`. This ensures Vite processes and bundles the HTML file correctly as part of the extension build.
SOURCE: https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin-docs/docs/concepts/03-content-scripts.md#_snippet_3

LANGUAGE: typescript
CODE:

```
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        welcome: 'pages/iframe.html',
      },
    },
  },
})
```
