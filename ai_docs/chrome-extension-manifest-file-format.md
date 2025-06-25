TITLE: Declare Permissions in Chrome Extension Manifest
DESCRIPTION: This JSON snippet illustrates the structure for declaring various types of permissions within a Chrome extension's manifest.json file, including standard API permissions, optional permissions, host permissions, and optional host permissions, along with the manifest version.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/mv3/declare_permissions

LANGUAGE: JSON
CODE:

```
{
  "name": "Permissions Extension",
  ...
  "permissions": [
    "activeTab",
    "contextMenus",
    "storage"
  ],
  "optional_permissions": [
    "topSites",
  ],
  "host_permissions": [
    "https://www.developer.chrome.com/*"
  ],
  "optional_host_permissions":[
    "https://*/*",
    "http://*/*"
  ],
  ...
  "manifest_version": 3
}
```

---

TITLE: Update Manifest Version Number for Chrome Extensions
DESCRIPTION: This snippet demonstrates how to change the `manifest_version` field from 2 to 3 in the `manifest.json` file, a required step for migrating Chrome Extensions to Manifest V3.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/migrating/manifest

LANGUAGE: JSON
CODE:

```
{
  ...
  "manifest_version": 2
  ...
}
```

LANGUAGE: JSON
CODE:

```
{
  ...
  "manifest_version": 3
  ...
}
```

---

TITLE: Define Chrome Extension Base Manifest (manifest.json)
DESCRIPTION: Configures the fundamental metadata for a Chrome extension, including manifest version, name, description, version, and icon paths. This is the essential starting point for any extension.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/get-started/tutorial/scripts-activetab

LANGUAGE: JSON
CODE:

```
{
  "manifest_version": 3,
  "name": "Focus Mode",
  "description": "Enable focus mode on Chrome's official Extensions and Chrome Web Store documentation.",
  "version": "1.0",
  "icons": {
    "16": "images/icon-16.png",
    "32": "images/icon-32.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png"
  }
}
```

---

TITLE: Basic CSS Nesting Syntax Examples
DESCRIPTION: Illustrates fundamental CSS nesting syntax, showing how to define styles for a child element within a parent's context. It demonstrates both implicit nesting (where a space is automatically added) and explicit nesting using the `&` symbol.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/css-ui/css-nesting

LANGUAGE: css
CODE:

```
.parent {
  color: blue;

  .child {
    color: red;
  }
}
```

LANGUAGE: css
CODE:

```
.parent {
  color: blue;

  & .child {
    color: red;
  }
}
```

---

TITLE: Persisting State in Manifest V3 Service Workers
DESCRIPTION: Explains that service workers are ephemeral and global variables are unreliable for state persistence because the context can be torn down. Recommends using Chrome Storage API as the source of truth for data to ensure it persists across service worker terminations.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/develop/migrate/to-service-workers

LANGUAGE: JavaScript
CODE:

```
let savedName = undefined;

chrome.runtime.onMessage.addListener(({ type, name }) => {
  if (type === "set-name") {
    savedName = name;
  }
});

chrome.browserAction.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { name: savedName });
});
```

LANGUAGE: JavaScript
CODE:

```
chrome.runtime.onMessage.addListener(({ type, name }) => {
  if (type === "set-name") {
    chrome.storage.local.set({ name });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  const { name } = await chrome.storage.local.get(["name"]);
  chrome.tabs.sendMessage(tab.id, { name });
});
```

---

TITLE: Example XSS Payload for Markdown Injection
DESCRIPTION: A demonstration of a cross-site scripting (XSS) attack payload. This payload, if unescaped and rendered via `innerHTML`, could execute arbitrary JavaScript, highlighting the security risks of naive Markdown parsing.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/ai/render-llm-responses

LANGUAGE: HTML
CODE:

```
<img src="pwned" onerror="javascript:alert('pwned!')">
```

---

TITLE: Validate External Message Senders in Chrome Extensions
DESCRIPTION: This snippet demonstrates how to register a listener for `chrome.runtime.onMessageExternal` and validate the sender's ID to ensure communication originates from a trusted external extension. This prevents malicious scripts from injecting unwanted data.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/mv3/security

LANGUAGE: javascript
CODE:

```
// The ID of an external extension
const kFriendlyExtensionId = "iamafriendlyextensionhereisdatas";

chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    if (sender.id === kFriendlyExtensionId)
      doSomething();
});
```

---

TITLE: Attach Scroll Timeline to Web Animation in JavaScript
DESCRIPTION: Integrate a `ScrollTimeline` instance with a standard Web Animation. Pass the `ScrollTimeline` object as the `timeline` property within the animation options. When using a timeline, ensure to omit any `duration` property from the animation options, as the timeline dictates the animation's progress.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/css-ui/scroll-driven-animations

LANGUAGE: JavaScript
CODE:

```
$el.animate({
  opacity: [0, 1],
}, {
  timeline: tl,
});
```

---

TITLE: Customize LanguageModel Session with topK and Temperature
DESCRIPTION: Demonstrates how to initialize a new LanguageModel session with custom `topK` and `temperature` parameters. It shows how to retrieve default parameters and apply a slightly higher temperature.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/ai/prompt-api

LANGUAGE: JavaScript
CODE:

```
const params = await LanguageModel.params();
// Initializing a new session must either specify both `topK` and
// `temperature` or neither of them.
const slightlyHighTemperatureSession = await LanguageModel.create({
  temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
  topK: params.defaultTopK,
});
```

---

TITLE: chrome.tabs API Reference
DESCRIPTION: Detailed reference for the `chrome.tabs` API, outlining its core functionality, available methods, and data types for interacting with browser tabs.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/reference/api/tabs

LANGUAGE: APIDOC
CODE:

```
API: chrome.tabs
Description: Use the chrome.tabs API to interact with the browser's tab system. You can use this API to create, modify, and rearrange tabs in the browser. The Tabs API not only offers features for manipulating and managing tabs, but can also detect the language of the tab, take a screenshot, and communicate with a tab's content scripts.

Methods:
  detectLanguage(): Detects the language of the tab.
  captureVisibleTab(): Takes a screenshot of the visible tab.
  sendMessage(): Communicates with a tab's content scripts.
  create(createProperties: object): Creates a new tab.
    createProperties:
      url: (optional) The URL to navigate the new tab to.
  reload(tabId: number, reloadProperties: object): Reloads a tab.
    tabId: The ID of the tab to reload.
    reloadProperties: (optional) An object containing properties for reloading.
  update(tabId: number, updateProperties: object): Navigates a tab to another URL.
    tabId: The ID of the tab to update.
    updateProperties:
      url: (optional) The URL to navigate the tab to.
  query(queryInfo: object): Queries tab instances.
    queryInfo: An object containing properties to filter the tabs.

Types:
  Tab: Represents a browser tab.
    Properties:
      url: The URL of the tab.
      pendingUrl: The URL that the tab is navigating to, if any.
      title: The title of the tab.
      favIconUrl: The URL of the tab's favicon.
```

---

TITLE: Register Event Listeners Synchronously in Manifest V3
DESCRIPTION: In Manifest V3, asynchronous listener registration is not guaranteed to work in service workers due to their ephemeral nature. This snippet demonstrates the problematic Manifest V2 approach and the correct Manifest V3 method of registering listeners at the top level of the script to ensure they are always active when an event is dispatched.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/migrating/to-service-workers

LANGUAGE: JavaScript
CODE:

```
chrome.storage.local.get(["badgeText"], ({ badgeText }) => {
  chrome.browserAction.setBadgeText({ text: badgeText });
  chrome.browserAction.onClicked.addListener(handleActionClick);
});
```

LANGUAGE: JavaScript
CODE:

```
chrome.action.onClicked.addListener(handleActionClick);

chrome.storage.local.get(["badgeText"], ({ badgeText }) => {
  chrome.action.setBadgeText({ text: badgeText });
});
```

---

TITLE: Use Shared Context for Multiple Rewriting Tasks
DESCRIPTION: Demonstrates how to leverage `sharedContext` when creating a `rewriter` object to provide a consistent background for generating multiple pieces of content. This helps the model align content better with expectations across different tasks.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/ai/rewriter-api

LANGUAGE: javascript
CODE:

```
// Shared context and per writing task context
const rewriter = await Rewriter.create({
  sharedContext: "This is for publishing on [popular website name], a business and employment-focused social media platform."
});

const stream = rewriter.rewriteStreaming(
  "Love all this work on generative AI at Google! So much to learn and so many new things I can do!",
  {
    context: "The request comes from someone working at a startup providing an e-commerce CMS solution.",
    tone: "more-casual",
  }
);

for await (const chunk of stream) {
  composeTextbox.append(chunk);
}
```

---

TITLE: Chrome Storage API Areas Overview
DESCRIPTION: This section provides a detailed overview of the four distinct storage areas available within the Chrome Extension Storage API: `local`, `sync`, `session`, and `managed`. It outlines their primary characteristics, quota limitations, and key considerations for their appropriate use in extension development.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/mv2/reference/storage

LANGUAGE: APIDOC
CODE:

```
Storage Areas:
  storage.local:
    Description: Data is stored locally, cleared when the extension is removed.
    Quota: Approximately 10 MB (can be increased by requesting "unlimitedStorage" permission). Before Chrome 114, quota was approximately 5 MB.
    Consideration: Use for larger amounts of data.
  storage.sync:
    Description: Data is synced to any Chrome browser the user is logged into if syncing is enabled. Behaves like storage.local if disabled. Stores data locally offline and resumes syncing when online.
    Quota: Approximately 100 KB total, 8 KB per item.
    Consideration: Use to preserve user settings across synced browsers.
    Warning: Not encrypted; do not store confidential user data. Consider session storage for sensitive data.
  storage.session:
    Description: Holds data in memory for the duration of a browser session. Not exposed to content scripts by default, but can be changed by setting chrome.storage.session.setAccessLevel().
    Quota: Approximately 10 MB. Before Chrome 112, quota was approximately 1 MB.
    Consideration: Use to store global variables across service worker runs.
    Warning: Not encrypted; do not store confidential user data.
  storage.managed:
    Description: Administrators can configure settings using a schema and enterprise policies in a managed environment. This storage area is read-only.
```

---

TITLE: Detect WebAuthn Conditional Create Availability
DESCRIPTION: This JavaScript snippet demonstrates how to check if the browser supports the WebAuthn Conditional Create feature. It uses `PublicKeyCredential.getClientCapabilities()` to determine if the `conditionalCreate` property is true, indicating support.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/identity/webauthn-conditional-create

LANGUAGE: JavaScript
CODE:

```
if (window.PublicKeyCredential && PublicKeyCredential.getClientCapabilities) {
  const capabilities = await PublicKeyCredential.getClientCapabilities();
  if (capabilities.conditionalCreate) {
    // Conditional create is available
  }
}
```

---

TITLE: Minimal Chrome Extension Manifest
DESCRIPTION: This JSON snippet defines the essential metadata for a Chrome extension, including its name, description, version, and the manifest version. It serves as the foundational configuration for any extension.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/mv2/overview

LANGUAGE: JSON
CODE:

```
{
  "name": "Hello Extensions",
  "description" : "Base Level Extension",
  "version": "1.0",
  "manifest_version": 2
}
```

---

TITLE: Detect CSS Nesting using Direct Nesting
DESCRIPTION: This CSS snippet demonstrates how to feature detect CSS nesting by applying styles directly within nested selectors. Elements with '.has-nesting' will be displayed if nesting is supported, while '.no-nesting' will be hidden.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/css-ui/css-nesting

LANGUAGE: CSS
CODE:

```
html {
  .has-nesting {
    display: block;
  }

  .no-nesting {
    display: none;
  }
}
```

---

TITLE: JavaScript Keyboard Handler for Accessible Toolbar Navigation
DESCRIPTION: This JavaScript function `optionKeyEvent` manages keyboard navigation within a toolbar. It processes Enter, Right Arrow, and Left Arrow key presses to enable circular navigation among toolbar buttons, updating the `aria-activedescendant` attribute to reflect the currently active element. It relies on external functions like `getCurrentButtonID`, `getNextButtonID`, and `getPrevButtonID`.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/how-to/ui/a11y

LANGUAGE: JavaScript
CODE:

```
 function optionKeyEvent(event) {
  var tb = event.target;
  var buttonid;

  ENTER_KEYCODE = 13;
  RIGHT_KEYCODE = 39;
  LEFT_KEYCODE = 37;
  // Partial sample code for processing arrow keys.
  if (event.type == "keydown") {
    // Implement circular keyboard navigation within the toolbar buttons
    if (event.keyCode == ENTER_KEYCODE) {
      ExecuteButtonAction(getCurrentButtonID());
      // getCurrentButtonID defined elsewhere
    } else if (event.keyCode == event.RIGHT_KEYCODE) {
      // Change the active toolbar button to the one to the right (circular).
      var buttonid = getNextButtonID();
      // getNextButtonID defined elsewhere
      tb.setAttribute("aria-activedescendant", buttonid);
    } else if (event.keyCode == event.LEFT_KEYCODE) {
      // Change the active toolbar button to the one to the left (circular).
      var buttonid = getPrevButtonID();
      // getPrevButtonID defined elsewhere
      tb.setAttribute("aria-activedescendant", buttonid);
    } else {
      return true;
    }
    return false;
  }
}
```

---

TITLE: Console API Methods Reference
DESCRIPTION: Detailed API documentation for the Chrome DevTools Console object and its methods, including parameters, descriptions, and log levels.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/devtools/console/api

LANGUAGE: APIDOC
CODE:

```
Console API:
  - console.assert(expression: boolean, object: any): void
    Description: Writes an error to the console when 'expression' evaluates to 'false'.
    Log Level: Error

  - console.clear(): void
    Description: Clears the console. Disabled if 'Preserve Log' is enabled.

  - console.count([label: string]): void
    Description: Writes the number of times that 'count()' has been invoked at the same line and with the same 'label'.
    Log Level: Info
    See Also: console.countReset([label])

  - console.countReset([label: string]): void
    Description: Resets a count previously set by 'console.count()'.
```

---

TITLE: Check and Troubleshoot Gemini Nano Model Availability
DESCRIPTION: These JavaScript console commands are used to verify the availability of the Gemini Nano model in Chrome DevTools. The first variant, using `await`, is for initial confirmation after enabling the API, while the second is typically used during troubleshooting to re-check the model's status. Both should return 'available' if the model is successfully downloaded and ready.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/ai/get-started

LANGUAGE: JavaScript
CODE:

```
await LanguageModel.availability();
```

LANGUAGE: JavaScript
CODE:

```
LanguageModel.availability();
```

---

TITLE: Unsafely Evaluate Script from Message in Chrome Extension Service Worker
DESCRIPTION: WARNING: This example demonstrates an unsafe method of evaluating a response from chrome.tabs.sendMessage using eval(). Using eval() with untrusted input can lead to arbitrary code execution and cross-site scripting (XSS) vulnerabilities.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/messaging

LANGUAGE: javascript
CODE:

```
chrome.tabs.sendMessage(tab.id, {greeting: "hello"}, function(response) {
  // WARNING! Might be evaluating a malicious script!
  var resp = eval(`(${response.farewell})`);
});
```

---

TITLE: Log Basic Information to DevTools Console (JavaScript)
DESCRIPTION: Demonstrates how to output a simple informational message to the DevTools Console using `console.log()`. This is the most common method for general logging.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/devtools/console/log

LANGUAGE: JavaScript
CODE:

```
console.log('Hello, Console!');
```

---

TITLE: Render Decoded Video Frames on Canvas
DESCRIPTION: This comprehensive JavaScript example demonstrates how to render decoded video frames onto an HTML canvas element. The handleFrame callback queues incoming frames, and renderFrame is responsible for scheduling and drawing them. It includes logic to calculate the appropriate time to display each frame based on its timestamp, ensuring smooth playback, and properly releases frame memory using frame.close() after drawing.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/web-platform/best-practices/webcodecs

LANGUAGE: JavaScript
CODE:

```
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let pendingFrames = [];
let underflow = true;
let baseTime = 0;

function handleFrame(frame) {
  pendingFrames.push(frame);
  if (underflow) setTimeout(renderFrame, 0);
}

function calculateTimeUntilNextFrame(timestamp) {
  if (baseTime == 0) baseTime = performance.now();
  let mediaTime = performance.now() - baseTime;
  return Math.max(0, timestamp / 1000 - mediaTime);
}

async function renderFrame() {
  underflow = pendingFrames.length == 0;
  if (underflow) return;

  const frame = pendingFrames.shift();

  // Based on the frame's timestamp calculate how much of real time waiting
  // is needed before showing the next frame.
  const timeUntilNextFrame = calculateTimeUntilNextFrame(frame.timestamp);
  await new Promise((r) => {
    setTimeout(r, timeUntilNextFrame);
  });
  ctx.drawImage(frame, 0, 0);
  frame.close();

  // Immediately schedule rendering of the next frame
  setTimeout(renderFrame, 0);
}
```

---

TITLE: Intercepting Form Submissions with Navigation API
DESCRIPTION: Demonstrates how to intercept HTML form submissions using the Navigation API's navigate event listener. It shows how to detect form data and use navigateEvent.intercept() to handle the submission via fetch(), preventing default navigation and controlling focus/scroll behavior.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/web-platform/navigation-api

LANGUAGE: javascript
CODE:

```
navigation.addEventListener('navigate', navigateEvent => {
  if (navigateEvent.formData && navigateEvent.canIntercept) {
    // User submitted a POST form to a same-domain URL
    // (If canIntercept is false, the event is just informative:
    // you can't intercept this request, although you could
    // likely still call .preventDefault() to stop it completely).

    navigateEvent.intercept({
      // Since we don't update the DOM in this navigation,
      // don't allow focus or scrolling to reset:
      focusReset: 'manual',
      scroll: 'manual',
      handler() {
        await fetch(navigateEvent.destination.url, {
          method: 'POST',
          body: navigateEvent.formData,
        });
        // You could navigate again with {history: 'replace'} to change the URL here,
        // which might indicate "done"
      },
    });
  }
});
```

---

TITLE: Pass message to selected tab's content script in Chrome Extensions
DESCRIPTION: This example demonstrates how an extension's service worker can communicate with content scripts in specific browser tabs using `tabs.sendMessage()`.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/reference/api/tabs

LANGUAGE: JavaScript
CODE:

```
function sendMessageToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, message);
  // TODO: Do something with the response.
}

```

---

TITLE: HTML Script Integration with CSP Nonce
DESCRIPTION: This HTML snippet demonstrates how to integrate a script tag with a `nonce` attribute, which is crucial for a nonce-based Content Security Policy. The `nonce` value (`random123` in this example) must be a unique, server-generated base64 string for each page load to ensure security.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/lighthouse/best-practices/csp-xss

LANGUAGE: HTML
CODE:

```
<script nonce="random123" src="https://trusted.example.com/trusted_script.js"></script>
```

---

TITLE: Process Streamed LLM Responses with DOMPurify and Streaming-Markdown in JavaScript
DESCRIPTION: This JavaScript code demonstrates a secure and performant approach to handling streamed content, such as responses from large language models. It accumulates incoming data chunks, then sanitizes the entire accumulated content using `DOMPurify` to prevent injection attacks. A crucial security check immediately halts processing if any insecure elements are detected. If the content is safe, the `streaming-markdown` parser processes each new chunk incrementally, efficiently updating the DOM without re-parsing previous content, thereby optimizing rendering performance.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/ai/render-llm-responses

LANGUAGE: JavaScript
CODE:

```
// `smd` is the streaming Markdown parser.
// `DOMPurify` is the HTML sanitizer.
// `chunks` is a string that concatenates all chunks received so far.
chunks += chunk;
// Sanitize all chunks received so far.
DOMPurify.sanitize(chunks);
// Check if the output was insecure.
if (DOMPurify.removed.length) {
  // If the output was insecure, immediately stop what you were doing.
  // Reset the parser and flush the remaining Markdown.
  smd.parser_end(parser);
  return;
}
// Parse each chunk individually.
// The `smd.parser_write` function internally calls `appendChild()` whenever
// there's a new opening HTML tag or a new text node.
// https://github.com/thetarnav/streaming-markdown/blob/80e7c7c9b78d22a9f5642b5bb5bafad319287f65/smd.js#L1149-L1205
smd.parser_write(parser, chunk);
```

---

TITLE: Scrutinize Internal Messages in Chrome Extensions
DESCRIPTION: This code shows how to listen for internal messages within a Chrome extension using `chrome.runtime.onMessage`. It emphasizes the importance of scrutinizing messages, even from the extension itself, to ensure they are not from a compromised content script by checking for allowed actions.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/mv2/security

LANGUAGE: javascript
CODE:

```
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.allowedAction)
    console.log("This is an allowed action.");
});
```

---

TITLE: Combine Multiple Workbox Recipes for Service Worker
DESCRIPTION: This snippet demonstrates how to quickly set up a comprehensive service worker by combining various Workbox recipes: `pageCache`, `imageCache`, `staticResourceCache`, `googleFontsCache`, and `offlineFallback`. This provides network-first for pages, stale-while-revalidate for static resources, cache-first for images, and offline support.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/workbox/modules/workbox-recipes

LANGUAGE: javascript
CODE:

```
import {
  pageCache,
  imageCache,
  staticResourceCache,
  googleFontsCache,
  offlineFallback,
} from 'workbox-recipes';

pageCache();

googleFontsCache();

staticResourceCache();

imageCache();

offlineFallback();
```

---

TITLE: Chrome Extensions LanguageModel API Reference
DESCRIPTION: Comprehensive API documentation for the LanguageModel namespace in Chrome Extensions, detailing its functions for checking model availability, creating sessions, retrieving parameters, and prompting the AI model.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/ai/prompt-api

LANGUAGE: APIDOC
CODE:

```
LanguageModel Namespace:
  availability(): Promise<"unavailable" | "downloadable" | "downloading" | "available">
    Description: Checks the availability and capabilities of the language model.
    Returns:
      "unavailable": Implementation does not support requested options or prompting.
      "downloadable": Supports options but requires download (model/fine-tuning).
      "downloading": Supports options but an ongoing download needs to finish.
      "available": Supports options without new downloads.

  create(options?: object): Promise<LanguageModelSession>
    Description: Starts a language model session.
    Parameters:
      options:
        monitor(m: EventTarget): void
          Description: A callback function to monitor download progress.
          m: An EventTarget that dispatches "downloadprogress" events.
            Event: "downloadprogress"
              e.loaded: Number (percentage of download completed, 0-1)

  params(): Promise<object>
    Description: Informs about the language model's parameters.
    Returns:
      object:
        defaultTopK: Number (default top-K value, default: 3)
        maxTopK: Number (maximum top-K value, 8)
        defaultTemperature: Number (default temperature, 1.0, range: 0.0-2.0)
        maxTemperature: Number (maximum temperature)

  prompt(text: string): Promise<string>
    Description: Prompts the model with a given text.
    Parameters:
      text: The input text for the prompt.
    Returns: The model's response as a string.

  promptStreaming(text: string): AsyncIterable<string>
    Description: Prompts the model with a given text and streams the response.
    Parameters:
      text: The input text for the prompt.
    Returns: An async iterable yielding parts of the model's response.
```

---

TITLE: Send and Receive Asynchronous Messages
DESCRIPTION: Demonstrates the pattern for sending a one-time message and receiving an asynchronous response. The event listener performs an asynchronous operation (fetch) and explicitly returns `true` to signal that `sendResponse` will be called later, keeping the message channel open.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/messaging

LANGUAGE: JavaScript
CODE:

```
// Event listener
function handleMessages(message, sender, sendResponse) {

  fetch(message.url)
    .then((response) => sendResponse({statusCode: response.status}))

  // Since `fetch` is asynchronous, must send an explicit `true`
  return true;
}

// Message sender
  const {statusCode} = await chrome.runtime.sendMessage({
    url: 'https://example.com'
  });
```

---

TITLE: Enable ES Module Imports for Extension Service Worker
DESCRIPTION: This JSON snippet shows how to configure the manifest.json to enable ES module imports within an extension service worker. By adding '"type": "module"' to the 'background' field, developers can use the 'import' statement for script dependencies.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/develop/concepts/service-workers/basics

LANGUAGE: JSON
CODE:

```
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  }
```

---

TITLE: API Permission: declarativeNetRequest
DESCRIPTION: Provides access to the chrome.declarativeNetRequest API, allowing extensions to block or modify network requests declaratively. This permission triggers a warning to the user.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/reference/permissions-list

LANGUAGE: APIDOC
CODE:

```
Permission: "declarativeNetRequest"
Description: Gives access to the chrome.declarativeNetRequest API.
Warning: Block content on any page.
```

---

TITLE: Speculation Rules API: Prerender Specific URLs
DESCRIPTION: This snippet demonstrates how to use the Speculation Rules API to instruct the browser to prerender a predefined list of URLs. The JSON object, embedded within a <script type="speculationrules"> tag, specifies an array of URLs to be prefetched and rendered in the background, improving navigation performance.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/web-platform/prerender-pages

LANGUAGE: HTML
CODE:

```
<script type="speculationrules">
{
  "prerender": [
    {
      "urls": ["next.html", "next2.html"]
    }
  ]
}
</script>

```

---

TITLE: Implement Service Worker for Extension Action
DESCRIPTION: This service-worker.js file handles the extension's background logic. It listens for clicks on the extension's action button and, when clicked, opens a new tab pointing to 'index.html', serving as the entry point for the extension's UI.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/how-to/integrate/oauth

LANGUAGE: JavaScript
CODE:

```
chrome.action.onClicked.addListener(function() {
  chrome.tabs.create({url: 'index.html'});
});
```

---

TITLE: Configure ES Module Service Worker in Manifest V3
DESCRIPTION: This snippet shows how to configure a service worker as an ES module in the Manifest V3 `background` section. Setting `type` to `module` allows the service worker script to use the `import` keyword for modularity. This feature was introduced in Chrome 92.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/whatsnew

LANGUAGE: JSON
CODE:

```
"background": {
  "service_worker": "script.js",
  "type": "module"
}
```

---

TITLE: Preloading Critical Images with HTML <link> Tag
DESCRIPTION: To improve Largest Contentful Paint (LCP), critical images can be preloaded by including a `<link rel="preload">` hint in the HTML head. This allows the browser to discover and fetch the image sooner, reducing render blocking and improving perceived performance.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/aurora/image-component

LANGUAGE: HTML
CODE:

```
<link rel="preload" as="image" href="important.png">
```

---

TITLE: Configure Chrome Extension Service Worker in Manifest
DESCRIPTION: This JSON configuration demonstrates how to declare a service worker in the `manifest.json` file for a Chrome extension. It sets `service_worker` to the path of the script and `type` to `module` for ES module support.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/mv3/manifest/background

LANGUAGE: JSON
CODE:

```
{
  ...
   "background": {
      "service_worker": "service-worker.js",
      "type": "module"
    },
  ...
}
```

---

TITLE: Content Security Policy Directives Reference
DESCRIPTION: A comprehensive list of Content Security Policy (CSP) directives, detailing their purpose and how they restrict various types of resources a web page can load. This includes directives for scripts, styles, images, media, forms, and more, as defined in CSP Level 2 and some Level 3 specifications.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/privacy-security/csp

LANGUAGE: APIDOC
CODE:

```
Content Security Policy Directives:

* base-uri: Restricts the URLs that can appear in a page's <base> element.
* child-src: Lists the URLs for workers and embedded frame contents. For example: child-src https://youtube.com would enable embedding videos from YouTube but not from other origins.
* connect-src: Limits the origins that you can connect to (via XHR, WebSockets, and EventSource).
* font-src: Specifies the origins that can serve web fonts. Google's web fonts could be enabled via font-src https://themes.googleusercontent.com.
* form-action: Lists valid endpoints for submission from <form> tags.
* frame-ancestors: Specifies the sources that can embed the current page. This directive applies to <frame>, <iframe>, <embed>, and <applet> tags. This directive can't be used in <meta> tags and applies only to non-HTML resources.
* frame-src: Was deprecated in level 2, but is restored in level 3. If not present it still falls back to child-src as before.
* img-src: Defines the origins from which images can be loaded.
* media-src: Restricts the origins allowed to deliver video and audio.
* object-src: Allows control over Flash and other plugins.
* plugin-types: Limits the kinds of plugins a page may invoke.
* report-uri: Specifies a URL where a browser will send reports when a content security policy is violated. This directive can't be used in <meta> tags.
* style-src: script-src's counterpart for stylesheets.
* upgrade-insecure-requests: Instructs user agents to rewrite URL schemes, changing HTTP to HTTPS. This directive is for websites with large numbers of old URL's that need to be rewritten.
* worker-src: (CSP Level 3) Restricts the URLs that may be loaded as a worker, shared worker, or service worker.

Default Behavior:
By default, directives are wide open. If a specific policy is not set for a directive (e.g., font-src), it behaves as though '*' was specified as the valid source.

default-src: Overrides this default behavior by defining defaults for most unspecified directives that end with '-src'. If default-src is set to https://example.com, and font-src is not specified, then fonts can only be loaded from https://example.com.

Directives not using default-src as fallback:
* base-uri
* form-action
* frame-ancestors
* plugin-types
* report-uri
* sandbox
```

---

TITLE: Send and Receive Asynchronous One-Time Messages
DESCRIPTION: This snippet demonstrates both the event listener and message sender sides for handling one-time requests. The event listener uses `fetch` asynchronously and explicitly returns `true` to keep the message channel open until `sendResponse` is called. The message sender awaits the response from `chrome.runtime.sendMessage`.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/develop/concepts/messaging

LANGUAGE: JavaScript
CODE:

```
// Event listener
function handleMessages(message, sender, sendResponse) {

  fetch(message.url)
    .then((response) => sendResponse({statusCode: response.status}))

  // Since `fetch` is asynchronous, must send an explicit `true`
  return true;
}

// Message sender
  const {statusCode} = await chrome.runtime.sendMessage({
    url: 'https://example.com'
  });
```

---

TITLE: Complete WebOTP API Implementation for SMS Autofill (JavaScript)
DESCRIPTION: This comprehensive JavaScript code snippet demonstrates the full workflow for using the WebOTP API to automatically fill one-time codes from SMS messages. It includes feature detection, obtaining the OTP via navigator.credentials.get(), populating the designated input field, and programmatically submitting the form, while also incorporating an AbortController to cancel the operation if the user manually submits the form.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/identity/web-apis/web-otp

LANGUAGE: JavaScript
CODE:

```
if ('OTPCredential' in window) {
  window.addEventListener('DOMContentLoaded', e => {
    const input = document.querySelector('input[autocomplete="one-time-code"]');
    if (!input) return;
    const ac = new AbortController();
    const form = input.closest('form');
    if (form) {
      form.addEventListener('submit', e => {
        ac.abort();
      });
    }
    navigator.credentials.get({
      otp: { transport:['sms'] },
      signal: ac.signal
    }).then(otp => {
      input.value = otp.code;
      if (form) form.submit();
    }).catch(err => {
      console.log(err);
    });
  });
}
```

---

TITLE: Programmatic Navigation with navigation.navigate()
DESCRIPTION: Explains the navigation.navigate() method for client-side navigation, detailing its return value (Promises for committed and finished states) and configurable options like state, history (for replacement), and info for passing additional data to the navigate event.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/web-platform/navigation-api

LANGUAGE: APIDOC
CODE:

```
navigation.navigate(url: string, options?: object): { committed: Promise<void>, finished: Promise<void> }
  url: The URL to navigate to.
  options: An optional object with the following properties:
    state: any - State for the new history entry, accessible via NavigationHistoryEntry.getState().
    history: "replace" | "auto" - Set to "replace" to replace the current history entry. Defaults to "auto".
    info: any - An object to pass to the navigate event via navigateEvent.info.
```

---

TITLE: Minimal Chrome Extension Manifest
DESCRIPTION: This example shows the basic manifest structure with only required keys for a Chrome extension, including manifest version, name, version, description, and icons.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/mv3/manifest

LANGUAGE: json
CODE:

```
{
  "manifest_version": 3,
  "name": "Minimal Manifest",
  "version": "1.0.0",
  "description": "A basic example extension with only required keys",
  "icons": {
    "48": "images/icon-48.png",
    "128": "images/icon-128.png"
  }
}
```

---

TITLE: Send Data between Service Worker and Content Script
DESCRIPTION: Demonstrates how to use message passing to enable communication between an extension's service worker and a content script. This allows the content script to request and receive data managed by the service worker, such as user information for UI initialization.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/mv2/runtime

LANGUAGE: javascript
CODE:

```
// 1. Send a message to the service worker requesting the user's data
chrome.runtime.sendMessage('get-user-data', (response) => {
  // 3. Got an asynchronous response with the data from the service worker
  console.log('received user data', response);
  initializeUI(response);
});
```

LANGUAGE: javascript
CODE:

```
// Example of a simple user data object
const user = {
  username: 'demo-user'
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 2. A page requested user data, respond with a copy of `user`
  if (message === 'get-user-data') {
    sendResponse(user);
  }
});
```

---

TITLE: Create Chrome Extension Popup HTML (hello.html)
DESCRIPTION: This HTML file provides the content for the extension's popup window. When the user clicks the extension's toolbar icon, this simple page displaying 'Hello Extensions' will appear.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/get-started/tutorial/hello-world

LANGUAGE: HTML
CODE:

```
<html>
  <body>
    <h1>Hello Extensions</h1>
  </body>
</html>
```

---

TITLE: Open the Command Menu in Chrome DevTools
DESCRIPTION: Instructions on how to quickly access the Command Menu in Chrome DevTools using keyboard shortcuts or the DevTools UI menu.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/devtools/command-menu

LANGUAGE: Keyboard Shortcuts
CODE:

```
Press Control+Shift+P (Windows / Linux) or Command+Shift+P (Mac).
```

LANGUAGE: DevTools UI
CODE:

```
Click "Customize and control DevTools" icon and then select "Run command".
```

---

TITLE: Inject Function into Content Script (Manifest V3)
DESCRIPTION: Illustrates the Manifest V3 approach to injecting a function using `chrome.scripting.executeScript()`. It shows how to pass arguments to the injected function via the `args` property and target a specific tab. This code is intended for the background service worker.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/extensions/develop/migrate/improve-security

LANGUAGE: javascript
CODE:

```
async function getCurrentTab() {/* ... */}
let tab = await getCurrentTab();

function showAlert(givenName) {
  alert(`Hello, ${givenName}`);
}

let name = 'World';
chrome.scripting.executeScript({
  target: {tabId: tab.id},
  func: showAlert,
  args: [name]
});
```

---

TITLE: Handling Navigations with the Navigation API
DESCRIPTION: Demonstrates how to use the `navigation.addEventListener('navigate', ...)` to centralize the handling of all types of navigations. The `NavigateEvent` provides details about the destination, allowing the code to `intercept()` the navigation with a custom handler or `preventDefault()` to cancel it. This approach is ideal for SPAs to manage content loading without full page reloads.
SOURCE: https://developer.chrome.com/docs/extensions/reference/manifest/web-platform/navigation-api

LANGUAGE: JavaScript
CODE:

```
navigation.addEventListener('navigate', navigateEvent => {
  // Exit early if this navigation shouldn't be intercepted.
  // The properties to look at are discussed later in the article.
  if (shouldNotIntercept(navigateEvent)) return;

  const url = new URL(navigateEvent.destination.url);

  if (url.pathname === '/') {
    navigateEvent.intercept({handler: loadIndexPage});
  } else if (url.pathname === '/cats/') {
    navigateEvent.intercept({handler: loadCatsPage});
  }
});
```
