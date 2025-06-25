TITLE: Installing daisyUI with npm
DESCRIPTION: This command installs the latest version of daisyUI as a development dependency using npm. It is the initial step required to integrate daisyUI into a project, making its component classes available for use with Tailwind CSS.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/blog/(posts)/what-is-daisyui/+page.md#_snippet_0

LANGUAGE: bash
CODE:

```
npm i -D daisyui@latest
```

---

TITLE: Using daisyUI LLMs in Cursor Chat (Markdown Prompt)
DESCRIPTION: This snippet demonstrates how to quickly instruct Cursor's chat window to use the daisyUI LLMs documentation by referencing its URL. This allows the AI to generate daisyUI-specific code based on the provided context.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/editor/cursor/+page.md#_snippet_0

LANGUAGE: Markdown
CODE:

```
@web https://daisyui.com/llms.txt
```

---

TITLE: Configuring daisyUI in Tailwind CSS
DESCRIPTION: This JavaScript snippet demonstrates how to add daisyUI as a plugin to your Tailwind CSS configuration file (tailwind.config.js). Including 'require("daisyui")' in the plugins array enables Tailwind CSS to process and include daisyUI's component styles in your build.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/blog/(posts)/what-is-daisyui/+page.md#_snippet_1

LANGUAGE: javascript
CODE:

```
module.exports = {
  //...
  plugins: [require("daisyui")]
}
```

---

TITLE: HTML Structure for DaisyUI Button Component
DESCRIPTION: This snippet provides the HTML markup for a DaisyUI button, enabling user interaction. The `button` element with `class="btn"` serves as the base, and it can be extensively customized with modifiers for color, style, behavior (active/disabled), size, and shape. The `btn` class can also be applied to `<a>` or `input` tags, and supports icons before or after the text. For disabled buttons using a class, set `tabindex="-1" role="button" aria-disabled="true"`.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/static/llms.txt#_snippet_19

LANGUAGE: html
CODE:

```
<button class="btn {MODIFIER}">Button</button>
```

---

TITLE: Configuring daisyUI Themes in CSS
DESCRIPTION: This snippet demonstrates how to configure daisyUI themes by modifying the `@plugin "daisyui"` directive in your CSS file. It shows how to enable specific themes, set a default theme using `--default`, and designate a theme for dark mode using `--prefersdark`.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/themes/+page.md#_snippet_0

LANGUAGE: diff
CODE:

```
  @import "tailwindcss";
- @plugin "daisyui";
+ @plugin "daisyui" {
+   themes: light --default, dark --prefersdark;
+ }
```

---

TITLE: Import daisyUI 5 and Tailwind CSS in CSS (Node Dependency)
DESCRIPTION: This CSS snippet demonstrates how to import Tailwind CSS and daisyUI 5 in a CSS file when installed as a Node.js dependency. This is the recommended approach for project setup.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/static/llms.txt#_snippet_1

LANGUAGE: CSS
CODE:

```
@import "tailwindcss";
@plugin "daisyui";
```

---

TITLE: Integrating daisyUI into CSS (CSS)
DESCRIPTION: This CSS snippet demonstrates how to include daisyUI in your project's main stylesheet, typically `src/styles.css`. The `@plugin "daisyui";` directive should be added, ideally after the `@import "tailwindcss";` line, to enable daisyUI's styling capabilities.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/install/waku/+page.md#_snippet_2

LANGUAGE: css
CODE:

```
@plugin "daisyui";
```

---

TITLE: Creating a Small DaisyUI Table in HTML
DESCRIPTION: This HTML snippet demonstrates how to construct a compact table using DaisyUI's `table-xs` class. It includes an `overflow-x-auto` wrapper for horizontal scrolling on smaller screens, a table header (`<thead>`), a table body (`<tbody>`) populated with sample data, and a table footer (`<tfoot>`) for summary information. This setup is ideal for displaying large datasets efficiently.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/components/table/+page.md#_snippet_8

LANGUAGE: HTML
CODE:

```
<div class="overflow-x-auto">
  <table class="table table-xs">
    <thead>
      <tr>
        <th></th>
        <th>Name</th>
        <th>Job</th>
        <th>company</th>
        <th>location</th>
        <th>Last Login</th>
        <th>Favorite Color</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th>1</th>
        <td>Cy Ganderton</td>
        <td>Quality Control Specialist</td>
        <td>Littel, Schaden and Vandervort</td>
        <td>Canada</td>
        <td>12/16/2020</td>
        <td>Blue</td>
      </tr>
      <tr>
        <th>2</th>
        <td>Hart Hagerty</td>
        <td>Desktop Support Technician</td>
        <td>Zemlak, Daniel and Leannon</td>
        <td>United States</td>
        <td>12/5/2020</td>
        <td>Purple</td>
      </tr>
      <tr>
        <th>3</th>
        <td>Brice Swyre</td>
        <td>Tax Accountant</td>
        <td>Carroll Group</td>
        <td>China</td>
        <td>8/15/2020</td>
        <td>Red</td>
      </tr>
      <tr>
        <th>4</th>
        <td>Marjy Ferencz</td>
        <td>Office Assistant I</td>
        <td>Rowe-Schoen</td>
        <td>Russia</td>
        <td>3/25/2021</td>
        <td>Crimson</td>
      </tr>
      <tr>
        <th>5</th>
        <td>Yancy Tear</td>
        <td>Community Outreach Specialist</td>
        <td>Wyman-Ledner</td>
        <td>Brazil</td>
        <td>5/22/2020</td>
        <td>Indigo</td>
      </tr>
      <tr>
        <th>6</th>
        <td>Irma Vasilik</td>
        <td>Editor</td>
        <td>Wiza, Bins and Emard</td>
        <td>Venezuela</td>
        <td>12/8/2020</td>
        <td>Purple</td>
      </tr>
      <tr>
        <th>7</th>
        <td>Meghann Durtnal</td>
        <td>Staff Accountant IV</td>
        <td>Schuster-Schimmel</td>
        <td>Philippines</td>
        <td>2/17/2021</td>
        <td>Yellow</td>
      </tr>
      <tr>
        <th>8</th>
        <td>Sammy Seston</td>
        <td>Accountant I</td>
        <td>O'Hara, Welch and Keebler</td>
        <td>Indonesia</td>
        <td>5/23/2020</td>
        <td>Crimson</td>
      </tr>
      <tr>
        <th>9</th>
        <td>Lesya Tinham</td>
        <td>Safety Technician IV</td>
        <td>Turner-Kuhlman</td>
        <td>Philippines</td>
        <td>2/21/2021</td>
        <td>Maroon</td>
      </tr>
      <tr>
        <th>10</th>
        <td>Zaneta Tewkesbury</td>
        <td>VP Marketing</td>
        <td>Sauer LLC</td>
        <td>Chad</td>
        <td>6/23/2020</td>
        <td>Green</td>
      </tr>
      <tr>
        <th>11</th>
        <td>Andy Tipple</td>
        <td>Librarian</td>
        <td>Hilpert Group</td>
        <td>Poland</td>
        <td>7/9/2020</td>
        <td>Indigo</td>
      </tr>
      <tr>
        <th>12</th>
        <td>Sophi Biles</td>
        <td>Recruiting Manager</td>
        <td>Gutmann Inc</td>
        <td>Indonesia</td>
        <td>2/12/2021</td>
        <td>Maroon</td>
      </tr>
      <tr>
        <th>13</th>
        <td>Florida Garces</td>
        <td>Web Developer IV</td>
        <td>Gaylord, Pacocha and Baumbach</td>
        <td>Poland</td>
        <td>5/31/2020</td>
        <td>Purple</td>
      </tr>
      <tr>
        <th>14</th>
        <td>Maribeth Popping</td>
        <td>Analyst Programmer</td>
        <td>Deckow-Pouros</td>
        <td>Portugal</td>
        <td>4/27/2021</td>
        <td>Aquamarine</td>
      </tr>
      <tr>
        <th>15</th>
        <td>Moritz Dryburgh</td>
        <td>Dental Hygienist</td>
        <td>Schiller, Cole and Hackett</td>
        <td>Sri Lanka</td>
        <td>8/8/2020</td>
        <td>Crimson</td>
      </tr>
      <tr>
        <th>16</th>
        <td>Reid Semiras</td>
        <td>Teacher</td>
        <td>Sporer, Sipes and Rogahn</td>
        <td>Poland</td>
        <td>7/30/2020</td>
        <td>Green</td>
      </tr>
      <tr>
        <th>17</th>
        <td>Alec Lethby</td>
        <td>Teacher</td>
        <td>Reichel, Glover and Hamill</td>
        <td>China</td>
        <td>2/28/2021</td>
        <td>Khaki</td>
      </tr>
      <tr>
        <th>18</th>
        <td>Aland Wilber</td>
        <td>Quality Control Specialist</td>
        <td>Kshlerin, Rogahn and Swaniawski</td>
        <td>Czech Republic</td>
        <td>9/29/2020</td>
        <td>Purple</td>
      </tr>
      <tr>
        <th>19</th>
        <td>Teddie Duerden</td>
        <td>Staff Accountant III</td>
        <td>Pouros, Ullrich and Windler</td>
        <td>France</td>
        <td>10/27/2020</td>
        <td>Aquamarine</td>
      </tr>
      <tr>
        <th>20</th>
        <td>Lorelei Blackstone</td>
        <td>Data Coordinator</td>
        <td>Witting, Kutch and Greenfelder</td>
        <td>Kazakhstan</td>
        <td>6/3/2020</td>
        <td>Red</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <th></th>
        <th>Name</th>
        <th>Job</th>
        <th>company</th>
        <th>location</th>
        <th>Last Login</th>
        <th>Favorite Color</th>
      </tr>
```

---

TITLE: Install daisyUI 5 using CDN
DESCRIPTION: This HTML snippet shows how to include daisyUI 5 and Tailwind CSS 4 via CDN links. It's an alternative to npm installation for direct browser usage.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/static/llms.txt#_snippet_0

LANGUAGE: HTML
CODE:

```
<link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

---

TITLE: Importing Tailwind CSS and daisyUI into Global Styles (PostCSS)
DESCRIPTION: This PostCSS snippet adds `@import "tailwindcss";` and `@plugin "daisyui";` to the global CSS file (e.g., `app/globals.css`). This integrates Tailwind CSS and daisyUI into the project's stylesheet, making their utility classes and components available for use.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/install/nextjs/+page.md#_snippet_3

LANGUAGE: postcss
CODE:

```
@import "tailwindcss";
@plugin "daisyui";
```

---

TITLE: Creating a Responsive HTML Table with DaisyUI
DESCRIPTION: This snippet demonstrates a standard HTML table structure enhanced with DaisyUI classes. The `overflow-x-auto` class ensures horizontal scrolling for responsiveness, while `table`, `table-xs`, `table-pin-rows`, and `table-pin-cols` apply DaisyUI's base table styles, compact sizing, and sticky header/footer/first column features. It includes a `<thead>` for column headers, a `<tbody>` for data rows, and a `<tfoot>` for a summary row.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/components/table/+page.md#_snippet_12

LANGUAGE: HTML
CODE:

```
<div class="overflow-x-auto">
  <table class="$$table $$table-xs $$table-pin-rows $$table-pin-cols">
    <thead>
      <tr>
        <th></th>
        <td>Name</td>
        <td>Job</td>
        <td>company</td>
        <td>location</td>
        <td>Last Login</td>
        <td>Favorite Color</td>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th>1</th>
        <td>Cy Ganderton</td>
        <td>Quality Control Specialist</td>
        <td>Littel, Schaden and Vandervort</td>
        <td>Canada</td>
        <td>12/16/2020</td>
        <td>Blue</td>
        <th>1</th>
      </tr>
      <tr>
        <th>2</th>
        <td>Hart Hagerty</td>
        <td>Desktop Support Technician</td>
        <td>Zemlak, Daniel and Leannon</td>
        <td>United States</td>
        <td>12/5/2020</td>
        <td>Purple</td>
        <th>2</th>
      </tr>
      <tr>
        <th>3</th>
        <td>Brice Swyre</td>
        <td>Tax Accountant</td>
        <td>Carroll Group</td>
        <td>China</td>
        <td>8/15/2020</td>
        <td>Red</td>
        <th>3</th>
      </tr>
      <tr>
        <th>4</th>
        <td>Marjy Ferencz</td>
        <td>Office Assistant I</td>
        <td>Rowe-Schoen</td>
        <td>Russia</td>
        <td>3/25/2021</td>
        <td>Crimson</td>
        <th>4</th>
      </tr>
      <tr>
        <th>5</th>
        <td>Yancy Tear</td>
        <td>Community Outreach Specialist</td>
        <td>Wyman-Ledner</td>
        <td>Brazil</td>
        <td>5/22/2020</td>
        <td>Indigo</td>
        <th>5</th>
      </tr>
      <tr>
        <th>6</th>
        <td>Irma Vasilik</td>
        <td>Editor</td>
        <td>Wiza, Bins and Emard</td>
        <td>Venezuela</td>
        <td>12/8/2020</td>
        <td>Purple</td>
        <th>6</th>
      </tr>
      <tr>
        <th>7</th>
        <td>Meghann Durtnal</td>
        <td>Staff Accountant IV</td>
        <td>Schuster-Schimmel</td>
        <td>Philippines</td>
        <td>2/17/2021</td>
        <td>Yellow</td>
        <th>7</th>
      </tr>
      <tr>
        <th>8</th>
        <td>Sammy Seston</td>
        <td>Accountant I</td>
        <td>O'Hara, Welch and Keebler</td>
        <td>Indonesia</td>
        <td>5/23/2020</td>
        <td>Crimson</td>
        <th>8</th>
      </tr>
      <tr>
        <th>9</th>
        <td>Lesya Tinham</td>
        <td>Safety Technician IV</td>
        <td>Turner-Kuhlman</td>
        <td>Philippines</td>
        <td>2/21/2021</td>
        <td>Maroon</td>
        <th>9</th>
      </tr>
      <tr>
        <th>10</th>
        <td>Zaneta Tewkesbury</td>
        <td>VP Marketing</td>
        <td>Sauer LLC</td>
        <td>Chad</td>
        <td>6/23/2020</td>
        <td>Green</td>
        <th>10</th>
      </tr>
      <tr>
        <th>11</th>
        <td>Andy Tipple</td>
        <td>Librarian</td>
        <td>Hilpert Group</td>
        <td>Poland</td>
        <td>7/9/2020</td>
        <td>Indigo</td>
        <th>11</th>
      </tr>
      <tr>
        <th>12</th>
        <td>Sophi Biles</td>
        <td>Recruiting Manager</td>
        <td>Gutmann Inc</td>
        <td>Indonesia</td>
        <td>2/12/2021</td>
        <td>Maroon</td>
        <th>12</th>
      </tr>
      <tr>
        <th>13</th>
        <td>Florida Garces</td>
        <td>Web Developer IV</td>
        <td>Gaylord, Pacocha and Baumbach</td>
        <td>Poland</td>
        <td>5/31/2020</td>
        <td>Purple</td>
        <th>13</th>
      </tr>
      <tr>
        <th>14</th>
        <td>Maribeth Popping</td>
        <td>Analyst Programmer</td>
        <td>Deckow-Pouros</td>
        <td>Portugal</td>
        <td>4/27/2021</td>
        <td>Aquamarine</td>
        <th>14</th>
      </tr>
      <tr>
        <th>15</th>
        <td>Moritz Dryburgh</td>
        <td>Dental Hygienist</td>
        <td>Schiller, Cole and Hackett</td>
        <td>Sri Lanka</td>
        <td>8/8/2020</td>
        <td>Crimson</td>
        <th>15</th>
      </tr>
      <tr>
        <th>16</th>
        <td>Reid Semiras</td>
        <td>Teacher</td>
        <td>Sporer, Sipes and Rogahn</td>
        <td>Poland</td>
        <td>7/30/2020</td>
        <td>Green</td>
        <th>16</th>
      </tr>
      <tr>
        <th>17</th>
        <td>Alec Lethby</td>
        <td>Teacher</td>
        <td>Reichel, Glover and Hamill</td>
        <td>China</td>
        <td>2/28/2021</td>
        <td>Khaki</td>
        <th>17</th>
      </tr>
```

---

TITLE: Adding a New Custom daisyUI Theme (CSS Plugin)
DESCRIPTION: This comprehensive CSS snippet demonstrates how to define a new custom daisyUI theme using the `@plugin "daisyui/theme"` directive. It includes configuration options for theme name, default status, dark mode preference, browser UI color scheme, and a full set of custom CSS variables for colors, border radii, sizes, and effects.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/themes/+page.md#_snippet_7

LANGUAGE: css
CODE:

```
@import "tailwindcss";
@plugin "daisyui";
@plugin "daisyui/theme" {
  name: "mytheme";
  default: true; /* set as default */
  prefersdark: false; /* set as default dark mode (prefers-color-scheme:dark) */
  color-scheme: light; /* color of browser-provided UI */

  --color-base-100: oklch(98% 0.02 240);
  --color-base-200: oklch(95% 0.03 240);
  --color-base-300: oklch(92% 0.04 240);
  --color-base-content: oklch(20% 0.05 240);
  --color-primary: oklch(55% 0.3 240);
  --color-primary-content: oklch(98% 0.01 240);
  --color-secondary: oklch(70% 0.25 200);
  --color-secondary-content: oklch(98% 0.01 200);
  --color-accent: oklch(65% 0.25 160);
  --color-accent-content: oklch(98% 0.01 160);
  --color-neutral: oklch(50% 0.05 240);
  --color-neutral-content: oklch(98% 0.01 240);
  --color-info: oklch(70% 0.2 220);
  --color-info-content: oklch(98% 0.01 220);
  --color-success: oklch(65% 0.25 140);
  --color-success-content: oklch(98% 0.01 140);
  --color-warning: oklch(80% 0.25 80);
  --color-warning-content: oklch(20% 0.05 80);
  --color-error: oklch(65% 0.3 30);
  --color-error-content: oklch(98% 0.01 30);

  /* border radius */
  --radius-selector: 1rem;
  --radius-field: 0.25rem;
  --radius-box: 0.5rem;

  /* base sizes */
  --size-selector: 0.25rem;
  --size-field: 0.25rem;

  /* border size */
  --border: 1px;

  /* effects */
  --depth: 1;
  --noise: 0;
}
```

---

TITLE: Creating Username Input with Icon and Validation in HTML
DESCRIPTION: This snippet demonstrates an HTML form input for a username, styled with DaisyUI's `input` and `validator` classes. It includes an SVG icon, client-side validation using `pattern`, `minlength`, and `maxlength` attributes, and a `validator-hint` paragraph for user guidance. The input requires a username between 3 and 30 characters, containing only letters, numbers, or dashes.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/components/input/+page.md#_snippet_11

LANGUAGE: HTML
CODE:

```
<label class="$$input $$validator">
  <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <g
      stroke-linejoin="round"
      stroke-linecap="round"
      stroke-width="2.5"
      fill="none"
      stroke="currentColor"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </g>
  </svg>
  <input
    type="text"
    required
    placeholder="Username"
    pattern="[A-Za-z][A-Za-z0-9\\-]*"
    minlength="3"
    maxlength="30"
    title="Only letters, numbers or dash"
  />
</label>
<p class="$$validator-hint">
  Must be 3 to 30 characters
  <br />containing only letters, numbers or dash
</p>
```

---

TITLE: Creating a Basic Card with No Image in DaisyUI (HTML)
DESCRIPTION: This snippet demonstrates a basic DaisyUI card component without an image. It includes a title, a paragraph for content, and a call-to-action button, all styled with `bg-base-100` and `shadow-sm` for a clean look.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/components/card/+page.md#_snippet_9

LANGUAGE: HTML
CODE:

```
<div class="$$card bg-base-100 w-96 shadow-sm">
  <div class="$$card-body">
    <h2 class="$$card-title">Card title!</h2>
    <p>A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <div class="$$card-actions justify-end">
      <button class="$$btn $$btn-primary">Buy Now</button>
    </div>
  </div>
</div>
```

---

TITLE: Importing Tailwind CSS and daisyUI in CSS (PostCSS)
DESCRIPTION: This PostCSS snippet illustrates how to import Tailwind CSS and daisyUI into the main CSS file (e.g., `src/App.css`) using `@import` and `@plugin` directives, replacing any old styles to ensure proper styling.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/install/react/+page.md#_snippet_3

LANGUAGE: postcss
CODE:

```
@import "tailwindcss";
@plugin "daisyui";
```

---

TITLE: Correct Dynamic Class Assignment in JSX
DESCRIPTION: This snippet demonstrates the correct way to use dynamic class names by assigning the complete class string to a variable. The variable is then used directly in the HTML/JSX, ensuring that the full class name exists as a string for Tailwind CSS to scan.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/blog/(posts)/most-common-mistake-when-using-tailwind-css/+page.md#_snippet_3

LANGUAGE: JSX
CODE:

```
let color = 'bg-red-500'
<div class="{{ color }}"></div>
```

---

TITLE: Linking Compiled CSS in HTML (HTML)
DESCRIPTION: This HTML snippet demonstrates how to link the generated `output.css` file to your `index.html`. By including this `<link>` tag, the compiled Tailwind CSS and daisyUI styles become available for use in your web page.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/install/postcss/+page.md#_snippet_5

LANGUAGE: html
CODE:

```
<link href="./output.css" rel="stylesheet">
```

---

TITLE: Import Tailwind CSS and daisyUI in app.css
DESCRIPTION: Add the Tailwind CSS and daisyUI imports to your main CSS file to include their styles.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/install/sveltekit/+page.md#_snippet_3

LANGUAGE: postcss
CODE:

```
@import "tailwindcss";
@plugin "daisyui";
```

---

TITLE: Importing Tailwind CSS and daisyUI in CSS (PostCSS)
DESCRIPTION: This PostCSS snippet, intended for `src/style.css`, imports the core Tailwind CSS utilities and registers the daisyUI plugin. The `@import` directive pulls in Tailwind's base styles and components, while `@plugin` enables daisyUI's component classes and themes, making them available for use in HTML.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/install/vite/+page.md#_snippet_3

LANGUAGE: postcss
CODE:

```
@import "tailwindcss";
@plugin "daisyui";
```

---

TITLE: Implementing a DaisyUI Navbar with Dropdown and Center Logo in HTML
DESCRIPTION: This HTML snippet demonstrates a functional daisyUI navbar component. It features a left-aligned dropdown menu for navigation, a centered brand/logo, and right-aligned action buttons for search and notifications, including an indicator badge. The 'mb-40' class adds margin-bottom for layout demonstration.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/components/navbar/+page.md#_snippet_6

LANGUAGE: html
CODE:

```
<div class="navbar bg-base-100 mb-40 shadow-sm">
  <div class="navbar-start">
    <div class="dropdown">
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
      </div>
      <ul tabindex="0" class="mt-3 z-1 p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
        <li><button>Homepage</button></li>
        <li><button>Portfolio</button></li>
        <li><button>About</button></li>
      </ul>
    </div>
  </div>
  <div class="navbar-center">
    <button class="btn btn-ghost text-xl">daisyUI</button>
  </div>
  <div class="navbar-end">
    <button class="btn btn-ghost btn-circle">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    </button>
    <button class="btn btn-ghost btn-circle">
      <div class="indicator">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        <span class="badge badge-xs badge-primary indicator-item"></span>
      </div>
    </button>
  </div>
</div>
```

---

TITLE: Implementing Email Validation with DaisyUI HTML
DESCRIPTION: This snippet demonstrates how to apply email validation using DaisyUI's `validator` class. It uses the HTML5 `type="email"` and `required` attributes to automatically change the input's color to error or success based on the validity of the entered email address. The placeholder provides an example format.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/components/validator/+page.md#_snippet_0

LANGUAGE: html
CODE:

```
<input class="$$input $$validator" type="email" required placeholder="mail@site.com" />
```

---

TITLE: Creating New Vite Project (Shell)
DESCRIPTION: This shell command initializes a new Vite project in the current directory, using the `--template vanilla` option to set up a basic JavaScript project without a specific framework. It's the first step to prepare the environment for Tailwind CSS and daisyUI.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/install/vite/+page.md#_snippet_0

LANGUAGE: sh
CODE:

```
npm create vite@latest ./ -- --template vanilla
```

---

TITLE: Recommended `fieldset` and `legend` HTML Structure (After)
DESCRIPTION: This snippet demonstrates the recommended HTML structure using `fieldset` and `legend` elements for improved accessibility, replacing the deprecated `form-control` and `label-text` classes. It shows how to structure a login form input using the new approach.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/CHANGELOG.md#_snippet_16

LANGUAGE: html
CODE:

```
<fieldset class="fieldset">
  <legend>Login</legend>
  <label class="label" for="name">Name</label>
  <input id="name" class="input" placeholder="Name" />
</fieldset>
```

---

TITLE: Implementing Dropdown with Popover API and Anchor Positioning in HTML
DESCRIPTION: This HTML snippet demonstrates creating a dropdown using the new Popover API and CSS Anchor Positioning. The button uses popovertarget to link to the popover content, and anchor-name along with position-anchor for relative positioning. Unique IDs for popovertarget and anchor-name are required for each dropdown.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/components/dropdown/+page.md#_snippet_1

LANGUAGE: HTML
CODE:

```
<!-- change popover-1 and --anchor-1 names. Use unique names for each dropdown -->
<button class="$$btn" popovertarget="popover-1" style="anchor-name:--anchor-1">
  Button
</button>
<ul class="$$dropdown $$menu w-52 rounded-box bg-base-100 shadow-sm"
  popover id="popover-1" style="position-anchor:--anchor-1">
  <li><a>Item 1</a></li>
  <li><a>Item 2</a></li>
</ul>
```

---

TITLE: Customizing daisyUI Buttons with Tailwind CSS Utility Classes (HTML)
DESCRIPTION: This snippet illustrates how to use standard Tailwind CSS utility classes, such as `rounded-full`, `rounded-none`, and `px-16`, directly on daisyUI components. This allows for fine-grained control over styling beyond daisyUI's predefined variants, enabling highly specific design adjustments.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/customize/+page.md#_snippet_2

LANGUAGE: html
CODE:

```
<button class="btn rounded-full">One</button>
<button class="btn rounded-none px-16">Two</button>
```

---

TITLE: Configuring Tailwind CSS in Nuxt (JavaScript)
DESCRIPTION: This JavaScript snippet for `nuxt.config.ts` integrates the Tailwind CSS Vite plugin into the Nuxt build process. It also specifies the main CSS file where Tailwind and daisyUI will be imported, ensuring styles are applied correctly.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/install/nuxt/+page.md#_snippet_2

LANGUAGE: js
CODE:

```
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  css: ["~/assets/app.css"],
});
```

---

TITLE: Importing Tailwind CSS and daisyUI (src/styles.css)
DESCRIPTION: This PostCSS snippet, placed in `src/styles.css`, imports the core Tailwind CSS utilities and integrates the daisyUI plugin. It ensures that both frameworks' styles are included and processed by the build system, replacing any old styles in the main stylesheet.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/install/angular/+page.md#_snippet_4

LANGUAGE: postcss
CODE:

```
@import "tailwindcss";
@plugin "daisyui";
```

---

TITLE: Migrating Form Control with Labels to Fieldset (HTML)
DESCRIPTION: This snippet illustrates the transition from `form-control` and `label-text-alt` classes to a more semantic `fieldset` structure. It demonstrates how to use `label` elements with `flex justify-between` to achieve similar layout for top and bottom labels, enhancing accessibility and flexibility.
SOURCE: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/docs/upgrade/+page.md#_snippet_23

LANGUAGE: html
CODE:

```
<label class="form-control w-full max-w-xs">
  <div class="label">
    <span class="label-text">What is your name?</span>
    <span class="label-text-alt">Top Right label</span>
  </div>
  <input type="text" placeholder="Type here" class="input input-bordered w-full max-w-xs" />
  <div class="label">
    <span class="label-text-alt">Bottom Left label</span>
    <span class="label-text-alt">Bottom Right label</span>
  </div>
</label>
```

LANGUAGE: html
CODE:

```
<fieldset class="fieldset max-w-xs">
  <label class="label flex justify-between" for="name">
    <span>What is your name?</span>
    <span>Top Right label</span>
  </label>
  <input id="name" class="input" placeholder="Name" />
  <label class="label flex justify-between" for="name">
    <span>Bottom Left label</span>
    <span>Bottom Right label</span>
  </label>
</fieldset>
```
