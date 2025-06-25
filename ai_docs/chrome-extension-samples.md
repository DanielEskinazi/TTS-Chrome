TITLE: Declaring Service Worker as ES Module in Manifest V3 (JSON)
DESCRIPTION: This JSON snippet demonstrates how to modify the `manifest.json` file to declare the extension's service worker as an ES Module. Adding `"type": "module"` to the `background` object is essential for enabling the import of WASM-generated JavaScript modules in Manifest V3 extensions.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.wasm-helloworld-print/README.md#_snippet_2

LANGUAGE: JSON
CODE:

```
"background": {
    "service_worker": "background.js",
    "type": "module"
}
```

---

TITLE: Compiling Handlebars Templates and Handling Post Messages - JavaScript
DESCRIPTION: This JavaScript snippet precompiles all Handlebars templates defined in `<script type='text/x-handlebars-template'>` tags on the page. It then sets up a `message` event listener on the `window` object to receive commands from a parent frame. Upon receiving a 'render' command with a valid template name and context, it renders the specified template and sends the result back to the source frame using `postMessage`. This is crucial for secure communication in sandboxed environments.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/sandbox/sandbox/sandbox.html#_snippet_0

LANGUAGE: JavaScript
CODE:

```
const templatesElements = document.querySelectorAll( "script\[type='text/x-handlebars-template'\]" );
let templates = {}, source, name; // precompile all templates in this page
for (let i = 0; i < templatesElements.length; i++) {
  source = templatesElements\[i\].innerHTML;
  name = templatesElements\[i\].id;
  templates\[name\] = Handlebars.compile(source);
}
// Set up message event handler:
window.addEventListener('message', function (event) {
  const command = event.data.command;
  const template = templates\[event.data.templateName\];
  let result = 'invalid request'; // if we don't know the templateName requested, return an error message
  if (template) {
    switch (command) {
      case 'render':
        result = template(event.data.context);
        break;
      // you could even do dynamic compilation, by accepting a command
      // to compile a new template instead of using static ones, for example:
      // case 'new':
      // template = Handlebars.compile(event.data.templateSource);
      // result = template(event.data.context);
      // break;
    }
  } else {
    result = 'Unknown template: ' + event.data.templateName;
  }
  event.source.postMessage({ result: result }, event.origin);
});
```

---

TITLE: Polyfilling XMLHttpRequest in Service Worker - JavaScript
DESCRIPTION: This JavaScript snippet demonstrates how to enable XHR functionality in a Chrome extension's service worker, which natively supports Fetch. It imports a custom `XMLHttpRequestShim` and assigns it to the global `XMLHttpRequest` object, allowing legacy code or third-party libraries dependent on XHR to operate correctly.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/libraries-xhr-in-sw/README.md#_snippet_2

LANGUAGE: JavaScript
CODE:

```
import { XMLHttpRequestShim } from './third_party/xhr-shim/xhr-shim.js';

globalThis.XMLHttpRequest = XMLHttpRequestShim;
```

---

TITLE: Subscribing to Silent Push Notifications in JavaScript
DESCRIPTION: This JavaScript call initiates a subscription to push notifications where `userVisibleOnly` is set to `false`. This allows the service worker to receive push messages without the browser being required to display a visible notification, demonstrating a silent push mechanism. It's typically called from the extension's background script or DevTools.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.push/README.md#_snippet_0

LANGUAGE: JavaScript
CODE:

```
await subscribeUserVisibleOnlyFalse();
```

---

TITLE: Configuring Push Server Public Key in JavaScript
DESCRIPTION: This snippet demonstrates how to declare and assign the `APPLICATION_SERVER_PUBLIC_KEY` in the `background.js` file of the Chrome extension. This public key is essential for the Push API subscription, linking the client-side subscription to the external push server for secure message delivery.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.push/README.md#_snippet_1

LANGUAGE: JavaScript
CODE:

```
const APPLICATION_SERVER_PUBLIC_KEY = 'YOUR_PUBLIC_KEY_HERE';
```

---

TITLE: Configuring Web Accessible Resources in Manifest.json
DESCRIPTION: This `manifest.json` snippet defines which extension resources are accessible to specific web pages. It uses the `web_accessible_resources` key to map image files to their allowed origins, ensuring controlled access. The `use_dynamic_url` flag is shown for one entry, indicating resources accessed via a dynamic ID that regenerates on browser restart or extension reload.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/web-accessible-resources/index.html#_snippet_1

LANGUAGE: JSON
CODE:

```
{
  "web_accessible_resources": [
    {
      "resources": [ "test1.png", "test2.png" ],
      "matches": [ "https://web-accessible-resources-1.glitch.me/*" ]
    },
    {
      "resources": [ "test3.png", "test4.png" ],
      "matches": [ "https://web-accessible-resources-2.glitch.me/*" ]
    },
    {
      "resources": [ "test4.png" ],
      "matches": [ "https://web-accessible-resources-3.glitch.me/*" ],
      "use_dynamic_url": true
    }
  ]
}
```

---

TITLE: Evaluating Inline JavaScript in Sandboxed iframe - JavaScript
DESCRIPTION: This snippet demonstrates how an inline JavaScript string can be evaluated within a sandboxed iframe. It uses `eval()` to dynamically set the `innerHTML` of an element with the ID 'message', showcasing a method for executing dynamic content while adhering to sandboxing principles. This approach is often used in Chrome Extensions for content that requires a less restrictive environment than the main extension context.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/sandbox/sandboxed-content/sandboxed.html#_snippet_0

LANGUAGE: JavaScript
CODE:

```
eval( "document.getElementById('message').innerHTML = '<p>I am the " + "output of an eval-ed inline script.</p>'" );
```

---

TITLE: Global Styling with Open Props in CSS
DESCRIPTION: This CSS snippet defines global styles for a web page, importing Open Props for a consistent design system. It includes normalization, button styles, and light/dark theme switches, along with custom font sizes, margins, padding, and styling for list items with hover effects and animations.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/ai.gemini-on-device-audio-scribe/sidepanel.html#_snippet_0

LANGUAGE: css
CODE:

```
@import 'https://unpkg.com/open-props';
@import 'https://unpkg.com/open-props/normalize.min.css';
@import 'https://unpkg.com/open-props/buttons.min.css';
@import 'https://unpkg.com/open-props/theme.light.switch.min.css';
@import 'https://unpkg.com/open-props/theme.dark.switch.min.css';

:root {
  --font-size-00: 0.6rem;
}

body {
  margin: auto;
  padding: var(--size-2);
}

ul {
  padding: var(--size-2);
}

li {
  background: var(--surface-3);
  border: 1px solid var(--surface-1);
  padding: var(--size-4);
  margin-bottom: var(--size-3);
  border-radius: var(--radius-3);
  box-shadow: var(--shadow-2);
  list-style: none;
  border-radius: var(--radius-2);
  padding: var(--size-fluid-3);
  box-shadow: var(--shadow-2);

  &:hover {
    box-shadow: var(--shadow-3);
  }

  @media (--motionOK) {
    animation: var(--animation-fade-in);
  }
}
```

---

TITLE: Building WASM with wasm-pack (Bash)
DESCRIPTION: These commands navigate into the `wasm` directory and then build the WebAssembly module using `wasm-pack`. The `--target no-modules` flag specifies that the output should be a standalone WASM file without JavaScript module wrappers, suitable for Manifest V3 extensions.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.wasm-helloworld-print-nomodule/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
cd wasm
wasm-pack build --target no-modules
```

---

TITLE: Dynamically Loading Web Accessible Resources with chrome.runtime.getURL() in JavaScript
DESCRIPTION: This JavaScript snippet demonstrates how to dynamically construct a URL for a web accessible resource using `chrome.runtime.getURL()`. It takes an extension resource path and returns a fully qualified URL, which can then be used to load the resource (e.g., an image) into a web page at runtime. This method is crucial for injecting resources that are not statically referenced.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/web-accessible-resources/index.html#_snippet_2

LANGUAGE: JavaScript
CODE:

```
const imagePath = 'test2.png'; // Example resource path
const imageUrl = chrome.runtime.getURL(imagePath);

// Example: Injecting the image into the DOM
const imgElement = document.createElement('img');
imgElement.src = imageUrl;
document.body.appendChild(imgElement);
```

---

TITLE: Querying Idle State with Chrome Idle API (JavaScript)
DESCRIPTION: This snippet illustrates the `chrome.idle.queryState` method, part of the Chrome Extensions API. It's used to determine the current idle state of the system based on a specified idle threshold and executes a callback function with the result.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/idle/history.html#_snippet_1

LANGUAGE: JavaScript
CODE:

```
chrome.idle.queryState(, ...);
```

---

TITLE: Building WASM module for web target (Rust)
DESCRIPTION: These commands navigate into the `wasm` directory and then use `wasm-pack` to build the WebAssembly module, specifically targeting the web environment. This process generates the necessary .wasm file and accompanying JavaScript glue code for browser compatibility.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.wasm-helloworld-print/README.md#_snippet_1

LANGUAGE: Bash
CODE:

```
cd wasm
wasm-pack build --target web
```

---

TITLE: Configuring Google Analytics 4 Measurement Protocol IDs in JavaScript
DESCRIPTION: This snippet defines constants for the Google Analytics 4 Measurement ID and API Secret, which are essential for sending events via the Measurement Protocol. These values must be replaced with actual credentials obtained from the GA4 property settings to enable proper event tracking.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/tutorial.google-analytics/README.md#_snippet_0

LANGUAGE: JavaScript
CODE:

```
const MEASUREMENT_ID = '<measurement_id>';
const API_SECRET = '<api_secret>';
```

---

TITLE: Styling Alt Text Generator UI with Open Props - CSS
DESCRIPTION: This CSS snippet defines the visual styles for the Alt Text Generator extension's user interface. It imports Open Props for consistent design tokens and normalizes browser styles. Key elements like the body, headings, text areas, and buttons are styled for layout, sizing, and basic appearance, ensuring a responsive and accessible design.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/ai.gemini-on-device-alt-texter/popup.html#_snippet_0

LANGUAGE: css
CODE:

```
@import 'https://unpkg.com/open-props';
@import 'https://unpkg.com/open-props/normalize.min.css';
@import 'https://unpkg.com/open-props/buttons.min.css';
@import 'https://unpkg.com/open-props/theme.light.switch.min.css';
@import 'https://unpkg.com/open-props/theme.dark.switch.min.css';
:root { --font-size-00: 0.6rem; }
body { margin: auto; padding: var(--size-2); width: 500px; padding: 10px; }
h4 { margin-bottom: var(--size-2); }
textarea { width: 100%; height: 100px; }
button { margin-right: 5px; }
#loading, textarea { margin: 16px 0; height: 200px; }
```

---

TITLE: Styling for Advanced Font Settings UI - CSS
DESCRIPTION: This CSS snippet defines the visual appearance and layout for the advanced font settings page of a Chrome Extension. It includes rules for overall page structure, specific font sample displays (standard, serif, sans-serif, fixed, minimum), and interactive elements like buttons and sliders, ensuring a consistent and responsive user experience.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/fontSettings/fontSettings Advanced/options.html#\_snippet_0

LANGUAGE: CSS
CODE:

```
body.uber-frame { margin-inline-start: 18px; margin-inline-end: 30px; }
body.uber-frame section { max-width: 650px; }
body.uber-frame section:last-of-type { margin-top: 28px; }
body.uber-frame header { left: 0; padding-inline-start: 18px; right: 0; }
body.uber-frame header > h1 { padding-bottom: 16px; }
h1 { font-size: 16px; }
.script-header { margin-top: 12px; }
h3 { margin-bottom: 11px; font-size: 14px; }
section { font-size: 12px; }
.bordered { border: 1px solid #d9d9d9; border-radius: 2px; }
.smaller { font-size: smaller; }
.font-settings-div { margin-inline-end: 5px; width: 180px; }
.font-settings-div:first-of-type { width: 138px; }
.font-settings-div > :first-child { margin-bottom: 10px; }
.font-settings-div > * { margin-bottom: 14px; }
.font-settings-row { display: -webkit-flex; width: 800px; }
.sample-text-div { display: -webkit-flex; white-space: nowrap; width: 100%; overflow: hidden; }
.sample-text-span { margin-top: auto; margin-bottom: auto; margin-left: 20px; }
#overlay-container { z-index: 100; }
#standardFontSample { font-family: standard; }
#serifFontSample { font-family: serif; }
#sansSerifFontSample { font-family: sans-serif; }
#fixedFontSample { font-family: monospace; }
#minFontSample { font-family: standard; }
select { width: 100%; }
#footer > button { padding-inline-start: 9px; padding-inline-end: 9px; }
#footer > #apply-settings { padding-inline-start: 17px; padding-inline-end: 17px; }
#apply-settings:enabled { background-color: #4f7dd6; background-image: none; border-color: #2a4aac; box-shadow: none; color: #fbfafb; text-shadow: none; }
.slider-legend { position: relative; /* This offset is needed to get the legend to align with the slider. */ top: -7px; }
.slider-container { display: inline-block; position: relative; top: 1px; height: 24px; width: 88px; }
```

---

TITLE: Applying Full-Page Flexbox Layout in CSS
DESCRIPTION: This CSS snippet sets the html, body, and a #container element to use flex display, ensuring they occupy the full viewport. The html element is fixed to the top, left, right, and bottom, while body and #container are configured to expand and fill the available space, providing a robust base for responsive layouts.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/devtools/inspectedWindow/panel.html#_snippet_0

LANGUAGE: CSS
CODE:

```
html { display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; } body { margin: 0; padding: 0; flex: 1; display: flex; width: 100%; } #container { display: flex; flex: 1; width: 100%; }
```

---

TITLE: Installing Native Messaging Host on Mac and Linux
DESCRIPTION: This script installs the native messaging host on Mac and Linux. By default, it installs for the current user, but can be run with 'sudo' to install for all users. An 'uninstall_host.sh' script is also available for removal.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/nativeMessaging/README.md#_snippet_1

LANGUAGE: Shell
CODE:

```
host/install_host.sh
```

---

TITLE: Installing Native Messaging Host on Windows
DESCRIPTION: This script installs the native messaging host for the current user on Windows by creating a specific registry key. It requires Python to be installed on the system. The script sets the default value of the registry key to the path of the host's manifest file.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/nativeMessaging/README.md#_snippet_0

LANGUAGE: Batch
CODE:

```
install_host.bat
```

---

TITLE: Styling Centered Container with CSS Grid
DESCRIPTION: This CSS rule defines a container class '.center' that uses CSS Grid to center its content both horizontally and vertically. It sets minimum dimensions, defines a gap between items, and applies a royal blue background color.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/action/popups/b.html#_snippet_0

LANGUAGE: CSS
CODE:

```
.center { min-height: 100px; min-width: 200px; display: grid; flex-direction: column; align-items: center; justify-content: center; gap: 1ch; background-color: royalblue; }
```

---

TITLE: Styling Centered Elements and Text in CSS
DESCRIPTION: This CSS snippet defines styles for two classes: `.center` and `.text`. The `.center` class creates a centered grid container with minimum dimensions, column-wise flex direction, and a lightseagreen background. The `.text` class styles text with a large, bold, white font.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/action/popups/popup.html#_snippet_0

LANGUAGE: css
CODE:

```
.center { min-height: 100px; min-width: 200px; display: grid; flex-direction: column; align-items: center; justify-content: center; gap: 1ch; background-color: lightseagreen; } .text { font-size: 2rem; font-weight: bold; color: white; }
```

---

TITLE: Styling Centered Elements and Text in CSS
DESCRIPTION: This CSS defines styles for a centered container (`.center`) and text elements (`.text`). The `.center` class uses CSS Grid for centering content, setting minimum dimensions, and defining background color and gap. The `.text` class styles text with a large font size, bold weight, and white color.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/action/popups/a.html#_snippet_0

LANGUAGE: CSS
CODE:

```
.center { min-height: 100px; min-width: 200px; display: grid; flex-direction: column; align-items: center; justify-content: center; gap: 1ch; background-color: salmon; } .text { font-size: 2rem; font-weight: bold; color: white; }
```

---

TITLE: Styling New Tab Page Div with CSS
DESCRIPTION: This CSS snippet defines the styling for a 'div' element, typically used as the main container for content on a blank new tab page in a Chrome extension. It sets the text color to light grey, vertically centers content, horizontally centers text, applies a sans-serif font, and sets a large font size.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/override/blank_ntp/blank.html#_snippet_0

LANGUAGE: CSS
CODE:

```
div { color: #cccccc; vertical-align: 50%; text-align: center; font-family: sans-serif; font-size: 300%; }
```

---

TITLE: Compiling JavaScript Bundle for Sidepanel (sh)
DESCRIPTION: This command compiles the JavaScript bundle specifically for the sidepanel implementation of the Chrome Extension. It's a crucial step to prepare the extension's UI logic for deployment and ensures the sidepanel functions correctly.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/ai.gemini-in-the-cloud/README.md#_snippet_1

LANGUAGE: sh
CODE:

```
npm run build
```

---

TITLE: Bundling Chrome Extension with Rollup - Shell
DESCRIPTION: This command executes the build script defined in `package.json`, which uses Rollup to bundle the extension's source code, including any polyfills or shims. This step prepares the extension for loading into Chrome.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/libraries-xhr-in-sw/README.md#_snippet_1

LANGUAGE: Shell
CODE:

```
npm run build
```

---

TITLE: Stylizr UI Base Styles - CSS
DESCRIPTION: This CSS snippet defines the foundational styles for the Stylizr extension's user interface elements. It sets font families for the body and textareas, block display for labels, and basic dimensions and background for message containers, ensuring a consistent visual presentation.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/storage/stylizr/options.html#_snippet_0

LANGUAGE: CSS
CODE:

```
body { font-family: sans-serif; } label { display: block; } textarea { font-family: monospace; } .message { height: 20px; background: #eee; padding: 5px; }
```

---

TITLE: Styling Button Hover State - CSS
DESCRIPTION: Defines the hover effect for button elements, adding a dotted thick outline in a light blue color (#80deea). This provides clear visual feedback to the user when they interact with a button, enhancing usability.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/functional-samples/sample.water_alarm_notification/popup.html#_snippet_3

LANGUAGE: CSS
CODE:

```
button:hover { outline: #80deea dotted thick; }
```

---

TITLE: Setting Minimum Width for Extension Body (CSS)
DESCRIPTION: This CSS snippet defines the minimum width for the `body` element of the extension's UI. It ensures that the extension's popup or page maintains a minimum width of 250 pixels, which helps in preserving readability and layout consistency, especially for content like lists of URLs.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/history/showHistory/popup.html#_snippet_0

LANGUAGE: css
CODE:

```
body { min-width: 250px; }
```

---

TITLE: Styling UI Elements for Tab Zoom Extension (CSS)
DESCRIPTION: This CSS snippet defines the styling for the body and image elements of a Chrome extension's popup. It sets the width, overflow, text color, and background for the body, and margins, border, vertical alignment, width, and height for images, likely used for icons or controls within the extension's interface.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/tabs/zoom/popup.html#_snippet_0

LANGUAGE: css
CODE:

```
body { width: 150px; overflow-x: hidden; color: #ffff00; background-color: #186464; } img { margin: 5px; border: 2px solid black; vertical-align: middle; width: 19px; height: 19px; }
```

---

TITLE: Styling Body and Input Elements with CSS
DESCRIPTION: This CSS snippet defines basic styling for the HTML body and input elements. It sets a minimum width and font size for the body to ensure readability and proper layout, and applies margin and removes outline for input fields to control their spacing and appearance.
SOURCE: https://github.com/googlechrome/chrome-extensions-samples/blob/main/api-samples/contextMenus/global_context_search/popup.html#_snippet_0

LANGUAGE: CSS
CODE:

```
body { min-width: 300px; font-size: 15px; } input { margin: 5px; outline: none; }
```
