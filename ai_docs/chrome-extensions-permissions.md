TITLE: Chrome Extension Permissions (manifest.json)
DESCRIPTION: This JSON snippet shows the required permissions in the Chrome extension's manifest.json file. These permissions are necessary for the MCP server to interact with the Chrome browser.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README.md#_snippet_10

LANGUAGE: JSON
CODE:

```
{
 "permissions": [
 "activeTab",
 "scripting",
 "cookies",
 "management",
 "tabs"
 ]
}
```

---

TITLE: Chrome Extension Permissions (JSON)
DESCRIPTION: Specifies the required permissions for the Chrome extension in the `manifest.json` file. These permissions allow the extension to access tabs, scripting capabilities, cookies, management APIs, and active tab information.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README_JP.md#_snippet_4

LANGUAGE: json
CODE:

```
{
  "permissions": [
    "activeTab",
    "scripting",
    "cookies",
    "management",
    "tabs"
  ]
}
```

---

TITLE: Example setText Operation
DESCRIPTION: This JSON snippet represents a DOM operation to set the text content of an element using setText. The `action` is set to `setText`, `selector` targets the element, and `value` sets the new text.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README.md#_snippet_7

LANGUAGE: JSON
CODE:

```
{
 "action": "setText",
 "selector": "#my-element",
 "value": "New text"
}
```

---

TITLE: Example querySelector Operation
DESCRIPTION: This JSON snippet represents a DOM operation to get element information using querySelector. The `action` is set to `querySelector` and the `selector` specifies the CSS selector of the target element.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README.md#_snippet_6

LANGUAGE: JSON
CODE:

```
{
 "action": "querySelector",
 "selector": "#my-element"
}
```

---

TITLE: DOM Operation Structure (TypeScript)
DESCRIPTION: Defines the structure for specifying DOM operations to be executed within a web page using `chrome_execute_script`. The `action` field specifies the type of operation, and other fields provide parameters such as CSS selectors, values, or attributes for the operation. This allows flexible manipulation of the DOM within the targeted tab.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README_JP.md#_snippet_3

LANGUAGE: typescript
CODE:

```
{
  action: string;  // 実行する操作の種類
  selector?: string;  // 要素を特定するCSSセレクタ
  value?: string | number | boolean;  // 設定する値
  attribute?: string;  // 属性名
  tagName?: string;  // createElement用のタグ名
  attributes?: Record<string, string | number | boolean>;  // 要素の属性
  innerText?: string;  // テキストコンテンツ
  elementId?: string;  // appendChild用の要素ID
  message?: string;  // log操作用のメッセージ
}
```

---

TITLE: Example click Operation
DESCRIPTION: This JSON snippet represents a DOM operation to trigger a click event on an element using click. The `action` is set to `click` and the `selector` specifies the element to click.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README.md#_snippet_9

LANGUAGE: JSON
CODE:

```
{
 "action": "click",
 "selector": "#my-button"
}
```

---

TITLE: Example createElement Operation
DESCRIPTION: This JSON snippet represents a DOM operation to create a new element using createElement. It defines the `tagName`, `attributes`, and `innerText` of the new element.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README.md#_snippet_8

LANGUAGE: JSON
CODE:

```
{
 "action": "createElement",
 "tagName": "div",
 "attributes": {
 "class": "my-class",
 "data-custom": "value"
 },
 "innerText": "New element"
}
```

---

TITLE: MCP Server Configuration (docker)
DESCRIPTION: This JSON configuration snippet defines the MCP server settings for the chromeextension using Docker. It specifies the command to execute (docker run), arguments, and environment variables, including the Chrome extension ID.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README.md#_snippet_5

LANGUAGE: JSON
CODE:

```
{
  "mcpServers": {
    "chromeextension": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "CHROME_EXTENSION_ID",
        "mcp/chromeextension"
      ],
      "env": {
        "CHROME_EXTENSION_ID": "your-extension-id"
      }
    }
  }
}
```

---

TITLE: MCP Server Configuration (npx) - JSON
DESCRIPTION: Configures the MCP server to use npx to run the chrome extension server. This configuration is added to the `claude_desktop_config.json` file. The `CHROME_EXTENSION_ID` environment variable must be set with the correct extension ID.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README_JP.md#_snippet_1

LANGUAGE: json
CODE:

```
{
  "mcpServers": {
    "chromeextension": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-chrome-extension"
      ],
      "env": {
        "CHROME_EXTENSION_ID": "your-extension-id"
      }
    }
  }
}
```

---

TITLE: MCP Server Configuration (npx)
DESCRIPTION: This JSON configuration snippet defines the MCP server settings for the chromeextension using npx. It specifies the command to execute, arguments to pass, and environment variables to set, including the Chrome extension ID.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README.md#_snippet_4

LANGUAGE: JSON
CODE:

```
{
  "mcpServers": {
    "chromeextension": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-chrome-extension"
      ],
      "env": {
        "CHROME_EXTENSION_ID": "your-extension-id"
      }
    }
  }
}
```

---

TITLE: MCP Server Configuration (Docker) - JSON
DESCRIPTION: Configures the MCP server to use Docker to run the chrome extension server. This configuration is added to the `claude_desktop_config.json` file. The `CHROME_EXTENSION_ID` environment variable must be set and passed to the Docker container.
SOURCE: https://github.com/tesla0225/chromeextension/blob/main/README_JP.md#_snippet_2

LANGUAGE: json
CODE:

```
{
  "mcpServers": {
    "chromeextension": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "CHROME_EXTENSION_ID",
        "mcp/chromeextension"
      ],
      "env": {
        "CHROME_EXTENSION_ID": "your-extension-id"
      }
    }
  }
}
```
