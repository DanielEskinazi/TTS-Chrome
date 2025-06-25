TITLE: Applying Custom Container Query Variant in HTML
DESCRIPTION: This HTML snippet illustrates how to use a custom container query variant, `@8xl:flex-row`, defined in the Tailwind CSS theme. By applying `@container` to a parent `div`, its child elements can respond to the custom `8xl` breakpoint, changing their layout from `flex-col` to `flex-row` when the container reaches the specified size.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/responsive-design.mdx#_snippet_19

LANGUAGE: html
CODE:

```
<div class="@container">
  <div class="flex flex-col @8xl:flex-row">
    <!-- ... -->
  </div>
</div>
```

---

TITLE: Defining Custom Utilities with @utility API in Tailwind CSS v4
DESCRIPTION: Tailwind CSS v4 replaces the @layer utilities and @layer components at-rules with the new @utility API for defining custom classes. This change aligns with native cascade layers and allows custom utilities to be sorted based on property count, enabling easier overriding by other Tailwind utilities.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/upgrade-guide.mdx#_snippet_20

LANGUAGE: CSS
CODE:

```
@layer utilities {
  .tab-4 {
    tab-size: 4;
  }
}
@utility tab-4 {
  tab-size: 4;
}
```

LANGUAGE: CSS
CODE:

```
@layer components {
  .btn {
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: ButtonFace;
  }
}
@utility btn {
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: ButtonFace;
}
```

---

TITLE: Conditionally Styling Specific Children with Data Attributes and _ Variant in JSX
DESCRIPTION: This JSX example illustrates how to combine the `_` variant with data attribute selectors (`data-[slot]`) to conditionally apply styles to specific direct children. The `Field`component uses`data-[slot=description]:\*:mt-4`to add top margin only to children with`data-slot="description"`, like the `Description` component. This enables advanced conditional styling from a parent component without complex arbitrary variants.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v3-4/index.mdx#_snippet_5

LANGUAGE: jsx
CODE:

```
function Field({ children }) {
  return (
    <div className="data-[slot=description]:*:mt-4 ...">
      {children}
    </div>
  )
}

function Description({ children }) {
  return (
    <p data-slot="description" ...>{children}</p>
  )
}

function Example() {
  return (
    <Field>
      <Label>First name</Label>
      <Input />
      <Description>Please tell me you know your own name.</Description>
    </Field>
  )
}
```

---

TITLE: Importing Tailwind CSS in Main CSS File
DESCRIPTION: This CSS snippet imports the Tailwind CSS framework into your main stylesheet. It's a crucial step to make Tailwind's utilities available for use in your project after installation and configuration.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v4-alpha/index.mdx#_snippet_13

LANGUAGE: CSS
CODE:

```
@import "tailwindcss";
```

---

TITLE: Tailwind CSS Card Component Example (JSX)
DESCRIPTION: A React/JSX example demonstrating a UI card component styled entirely with Tailwind CSS utility classes. It features a responsive layout, custom SVG icon, and dynamic text content, showcasing the utility-first approach for styling directly in markup.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/styling-with-utility-classes.mdx#_snippet_0

LANGUAGE: jsx
CODE:

```
<div className="mx-auto flex max-w-sm items-center gap-x-4 rounded-xl bg-white p-6 shadow-lg outline outline-black/5 dark:bg-slate-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
  <svg className="size-12 shrink-0" viewBox="0 0 40 40">
    <defs>
      <linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="a">
        <stop stopColor="#2397B3" offset="0%"></stop>
        <stop stopColor="#13577E" offset="100%"></stop>
      </linearGradient>
      <linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="b">
        <stop stopColor="#73DFF2" offset="0%"></stop>
        <stop stopColor="#47B1EB" offset="100%"></stop>
      </linearGradient>
    </defs>
    <g fill="none" fillRule="evenodd">
      <path
        d="M28.872 22.096c.084.622.128 1.258.128 1.904 0 7.732-6.268 14-14 14-2.176 0-4.236-.496-6.073-1.382l-6.022 2.007c-1.564.521-3.051-.966-2.53-2.53l2.007-6.022A13.944 13.944 0 0 1 1 24c0-7.331 5.635-13.346 12.81-13.95A9.967 9.967 0 0 0 13 14c0 5.523 4.477 10 10 10a9.955 9.955 0 0 0 5.872-1.904z"
        fill="url(#a)"
        transform="translate(1 1)"
      ></path>
      <path
        d="M35.618 20.073l2.007 6.022c.521 1.564-.966 3.051-2.53 2.53l-6.022-2.007A13.944 13.944 0 0 1 23 28c-7.732 0-14-6.268-14-14S15.268 0 23 0s14 6.268 14 14c0 2.176-.496 4.236-1.382 6.073z"
        fill="url(#b)"
        transform="translate(1 1)"
      ></path>
      <path
        d="M18 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM24 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM30 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
        fill="#FFF"
      ></path>
    </g>
  </svg>
  <div>
    <div className="text-xl font-medium text-black dark:text-white">ChitChat</div>
    <p className="text-gray-500 dark:text-gray-400">You have a new message!</p>
  </div>
</div>
```

---

TITLE: Implementing Tabs with Headless UI in React
DESCRIPTION: This snippet demonstrates how to create a basic tab interface using the `Tab` component from `@headlessui/react`. It shows the declarative structure for `Tab.Group`, `Tab.List`, `Tab`, `Tab.Panels`, and `Tab.Panel` to manage tab navigation and content display, abstracting away accessibility concerns.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/headless-ui-v1-4/index.mdx#_snippet_0

LANGUAGE: jsx
CODE:

```
import { Tab } from '@headlessui/react'

function MyTabs() {
  return (
    <Tab.Group>
      <Tab.List>
        <Tab>Tab 1</Tab>
        <Tab>Tab 2</Tab>
        <Tab>Tab 3</Tab>
      </Tab.List>
      <Tab.Panels>
        <Tab.Panel>Content 1</Tab.Panel>
        <Tab.Panel>Content 2</Tab.Panel>
        <Tab.Panel>Content 3</Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  )
}
```

---

TITLE: Update Tailwind CLI Commands for v4
DESCRIPTION: Adjust your build commands to use the new dedicated `@tailwindcss/cli` package for Tailwind CSS v4, replacing the old `tailwindcss` package.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/upgrade-guide.mdx#_snippet_3

LANGUAGE: sh
CODE:

```
npx @tailwindcss/cli -i input.css -o output.css
```

---

TITLE: Installing Tailwind CSS v3.1 via npm
DESCRIPTION: This command installs the latest version of Tailwind CSS using npm, updating an existing project or setting up a new one with the most recent features and bug fixes.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v3-1/index.mdx#_snippet_0

LANGUAGE: sh
CODE:

```
npm install tailwindcss@latest
```

---

TITLE: Integrating Theme Variables with Framer Motion in JSX
DESCRIPTION: This JSX snippet illustrates how native CSS variables, derived from the Tailwind theme, can be directly utilized within JavaScript UI libraries like Framer Motion. This avoids the need for resolveConfig(), streamlining the integration of design tokens into animation properties.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v4-alpha/index.mdx#_snippet_10

LANGUAGE: jsx
CODE:

```
// [!code filename:JSX]
import { motion } from "framer-motion";

export const MyComponent = () => (
  <motion.div initial={{ y: "var(--spacing-8)" }} animate={{ y: 0 }} exit={{ y: "var(--spacing-8)" }}>
    {children}
  </motion.div>
);
```

---

TITLE: Tailwind CSS Card Component Example (HTML)
DESCRIPTION: A standard HTML example demonstrating a UI card component styled entirely with Tailwind CSS utility classes. It features an image, text content, and showcases the direct application of utility classes for layout and appearance.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/styling-with-utility-classes.mdx#_snippet_1

LANGUAGE: html
CODE:

```
<!-- prettier-ignore -->
<div class="mx-auto flex max-w-sm items-center gap-x-4 rounded-xl bg-white p-6 shadow-lg outline outline-black/5 dark:bg-slate-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
  <img class="size-12 shrink-0" src="/img/logo.svg" alt="ChitChat Logo" />
  <div>
    <div class="text-xl font-medium text-black dark:text-white">ChitChat</div>
    <p class="text-gray-500 dark:text-gray-400">You have a new message!</p>
  </div>
</div>
```

---

TITLE: Using CSS Variables in Arbitrary Values in Tailwind CSS v4
DESCRIPTION: Tailwind CSS v4 updates the syntax for using CSS variables as arbitrary values. Due to potential ambiguities with recent CSS changes, the new syntax requires parentheses () instead of square brackets [] for variable shorthand.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/upgrade-guide.mdx#_snippet_22

LANGUAGE: HTML
CODE:

```
<div class="bg-[--brand-color]"></div>
<div class="bg-(--brand-color)"></div>
```

---

TITLE: Styling Radio Button Labels with Tailwind CSS and Pointer Variants (JSX)
DESCRIPTION: This JSX snippet demonstrates styling a radio button label using Tailwind CSS, including responsive adjustments for coarse pointer devices (e.g., touchscreens) via the `pointer-coarse:p-4` utility. It sets up a flexible layout, applies various background, text, ring, and focus styles, and visually hides the native radio input.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v4-1/index.mdx#_snippet_16

LANGUAGE: JSX
CODE:

```
<label className="flex items-center justify-center rounded-md bg-white p-2 text-sm font-semibold text-gray-900 uppercase ring-1 ring-gray-300 not-data-focus:not-has-checked:ring-inset hover:bg-gray-50 has-checked:bg-indigo-600 has-checked:text-white has-checked:ring-0 has-checked:hover:bg-indigo-500 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-indigo-600 data-focus:ring-2 data-focus:ring-indigo-600 data-focus:ring-offset-2 data-focus:has-checked:ring-2 sm:flex-1 dark:bg-transparent dark:text-white dark:ring-white/20 dark:hover:bg-gray-950/50 pointer-coarse:p-4">
          <input type="radio" name="memory-option" value="128 GB" className="sr-only" />
          <span>128 GB</span>
        </label>
```

---

TITLE: Hiding Elements Visually with sr-only (HTML)
DESCRIPTION: This snippet demonstrates the use of the `sr-only` utility class in Tailwind CSS. Applying `sr-only` to an element, such as a `<span>` tag, visually hides it from sighted users while ensuring it remains accessible to screen readers. This is useful for providing descriptive text for icons or other non-textual elements without cluttering the visual interface.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/display.mdx#_snippet_15

LANGUAGE: html
CODE:

```
<!-- [!code classes:sr-only] -->
<a href="#">
  <svg><!-- ... --></svg>
  <span class="sr-only">Settings</span>
</a>
```

---

TITLE: Applying Dynamic Data Attribute Variants - HTML
DESCRIPTION: This HTML snippet illustrates the ability to target custom boolean data attributes dynamically in Tailwind CSS v4.0. The `data-current:opacity-100` variant applies styles when the `data-current` attribute is present, removing the need for explicit variant configuration.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v4/index.mdx#_snippet_14

LANGUAGE: HTML
CODE:

```
<div data-current class="opacity-75 data-current:opacity-100">
  <!-- ... -->
</div>
```

---

TITLE: Demonstrating Logical Properties with Tailwind CSS (JSX)
DESCRIPTION: This JSX example showcases how logical properties behave in both left-to-right (LTR) and right-to-left (RTL) contexts. It uses standard `left-0` and `right-0` for demonstration, setting up two columns to visually compare positioning based on text direction, illustrating the need for logical properties like `start-0` for adaptable layouts.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/top-right-bottom-left.mdx#_snippet_4

LANGUAGE: jsx
CODE:

```
<div className="grid grid-cols-2 place-items-center gap-x-4">
      <div className="flex flex-col items-start gap-y-4">
        <p className="text-sm font-medium">Left-to-right</p>
        <div className="relative size-18 rounded-lg sm:size-32">
          <div className="absolute inset-0">
            <Stripes border className="h-full rounded-lg" />
          </div>
          <div className="absolute top-0 left-0 flex size-14 items-center justify-center rounded-lg bg-purple-500 p-4"></div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-y-4">
        <p className="text-sm font-medium">Right-to-left</p>
        <div className="relative size-18 rounded-lg sm:size-32">
          <div className="absolute inset-0">
            <Stripes border className="h-full rounded-lg" />
          </div>
          <div className="absolute top-0 right-0 flex size-14 items-center justify-center rounded-lg bg-purple-500 p-4"></div>
        </div>
      </div>
    </div>
```

---

TITLE: Update PostCSS Configuration for Tailwind CSS v4
DESCRIPTION: Migrate your PostCSS configuration to use the new dedicated `@tailwindcss/postcss` package in v4. In v4, imports and vendor prefixing are handled automatically, allowing you to remove `postcss-import` and `autoprefixer`.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/upgrade-guide.mdx#_snippet_1

LANGUAGE: js
CODE:

```
export default {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};
```

---

TITLE: Managing Hover Styles on Mobile in Tailwind CSS v4
DESCRIPTION: In Tailwind CSS v4, the hover variant now applies only when the primary input device supports hover, which can affect touch devices. If tap-to-hover functionality is required, the hover variant can be overridden with a custom variant using the old implementation, though treating hover as an enhancement is generally recommended.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/upgrade-guide.mdx#_snippet_23

LANGUAGE: CSS
CODE:

```
@media (hover: hover) {
  .hover\:underline:hover {
    text-decoration: underline;
  }
}
```

LANGUAGE: CSS
CODE:

```
@custom-variant hover (&:hover);
```

---

TITLE: Composing Tailwind CSS Variants in HTML
DESCRIPTION: This snippet illustrates the enhanced composability of Tailwind CSS v4 variants. It shows how `group-*` can be combined with `has-*` and `focus` to create complex, dynamic selectors like `group-has-[&:focus]:opacity-100`, demonstrating the framework's shift towards more flexible and powerful variant combinations.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v4-alpha/index.mdx#_snippet_2

LANGUAGE: HTML
CODE:

```
<div class="group">
  <div class="group-has-[&:focus]:opacity-100">
  <div class="group-has-focus:opacity-100">
      <!-- ... -->
    </div>
  </div>
</div>
```

---

TITLE: Importing Tailwind CSS v4.0 in CSS
DESCRIPTION: This CSS line imports the entire Tailwind CSS framework into a project's stylesheet. In v4.0, this single @import rule replaces the previous @tailwind directives, streamlining the process of including Tailwind's base styles, components, and utilities.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v4/index.mdx#_snippet_6

LANGUAGE: CSS
CODE:

```
@import "tailwindcss";
```

---

TITLE: Resetting Element Margins and Paddings in Preflight CSS
DESCRIPTION: This Preflight CSS rule removes all default margins and paddings from all elements, including pseudo-elements and specific form controls. This ensures a clean slate, preventing accidental reliance on browser-default spacing and promoting consistent spacing based on Tailwind's utility classes.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/preflight.mdx#_snippet_1

LANGUAGE: CSS
CODE:

```
*,
::after,
::before,
::backdrop,
::file-selector-button {
  margin: 0;
  padding: 0;
}
```

---

TITLE: Applying Container-Based Responsive Queries in Tailwind CSS
DESCRIPTION: Demonstrates how to use Tailwind CSS's container query variants (`@container`, `@md`) to apply styles based on the width of a parent container, rather than the global viewport. This enables more localized responsive designs.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/hover-focus-and-other-states.mdx#_snippet_37

LANGUAGE: HTML
CODE:

```
<div class="@container">
  <div class="flex flex-col @md:flex-row">
    <!-- ... -->
  </div>
</div>
```

---

TITLE: Avoiding Dynamic Class Names from Props in JSX with Tailwind
DESCRIPTION: This JSX code shows an incorrect method of constructing Tailwind class names using string interpolation with component props. Since Tailwind scans files as plain text, it cannot resolve `bg-${color}-600` into complete class names like `bg-blue-600`, resulting in missing styles.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/detecting-classes-in-source-files.mdx#_snippet_3

LANGUAGE: JSX
CODE:

```
function Button({ color, children }) {
  return <button className={`bg-${color}-600 hover:bg-${color}-500 ...`}>{children}</button>;
}
```

---

TITLE: Installing Tailwind CSS Standalone CLI (macOS arm64)
DESCRIPTION: This snippet demonstrates how to download the standalone Tailwind CSS CLI executable for macOS arm64, grant it executable permissions, and rename it for convenient use. This process allows users to get started without Node.js or npm.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/standalone-cli/index.mdx#_snippet_0

LANGUAGE: sh
CODE:

```
# Example for macOS arm64
curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-arm64
chmod +x tailwindcss-macos-arm64
mv tailwindcss-macos-arm64 tailwindcss
```

---

TITLE: HTML Example for Class-based Dark Mode Toggling
DESCRIPTION: This HTML snippet demonstrates how the `dark` class is applied to the `<html>` element to activate dark mode utilities. When the `dark` class is present, `dark:bg-black` will override `bg-white`, changing the background color. This setup requires JavaScript to dynamically add or remove the `dark` class.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/dark-mode.mdx#_snippet_2

LANGUAGE: html
CODE:

```
<html class="dark">
  <body>
    <div class="bg-white dark:bg-black">
      <!-- ... -->
    </div>
  </body>
</html>
```

---

TITLE: Accessing Theme Variables in CSS - Generated CSS
DESCRIPTION: This snippet shows the generated CSS output from the `@theme` configuration, where all defined design tokens are automatically converted into CSS custom properties (variables) under the `:root` selector. This enables runtime access and manipulation of theme values directly in CSS or JavaScript.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v4/index.mdx#_snippet_12

LANGUAGE: CSS
CODE:

```
:root {
  --font-display: "Satoshi", "sans-serif";

  --breakpoint-3xl: 1920px;

  --color-avocado-100: oklch(0.99 0 0);
  --color-avocado-200: oklch(0.98 0.04 113.22);
  --color-avocado-300: oklch(0.94 0.11 115.03);
  --color-avocado-400: oklch(0.92 0.19 114.08);
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --color-avocado-600: oklch(0.53 0.12 118.34);

  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);

  /* ... */
}
```

---

TITLE: Balancing Headline Text with `text-balance` in HTML
DESCRIPTION: This snippet demonstrates the `text-balance` utility, which leverages `text-wrap: balance` CSS property to automatically optimize the wrapping of headline text. It helps prevent awkward line breaks and ensures a visually balanced appearance for headings, improving readability without manual adjustments.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v3-4/index.mdx#_snippet_7

LANGUAGE: HTML
CODE:

```
<article>
  <h3 class="text-balance ...">Beloved Manhattan soup stand closes<h3>
  <p>New Yorkers are facing the winter chill...</p>
</article>
```

---

TITLE: Using Arbitrary Container Query Values in HTML
DESCRIPTION: This HTML snippet demonstrates the use of arbitrary container query values, such as `@min-[475px]`, for one-off responsive styling without modifying the theme. When the `@container` element's width is at least `475px`, the child element's flex direction will change from `flex-col` to `flex-row`, providing flexible, on-the-fly breakpoint control.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/responsive-design.mdx#_snippet_20

LANGUAGE: html
CODE:

```
<div class="@container">
  <div class="flex flex-col @min-[475px]:flex-row">
    <!-- ... -->
  </div>
</div>
```

---

TITLE: Tailwind CSS Variant: has-[...]
DESCRIPTION: CSS equivalent for the Tailwind CSS `has-[...]` variant, applying styles to an element if it contains a specific selector.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/hover-focus-and-other-states.mdx#_snippet_91

LANGUAGE: css
CODE:

```
&:has(...)
```

---

TITLE: Tailwind CSS Peer-Invalid for Input Validation
DESCRIPTION: Demonstrates how to implement client-side input validation styling using Tailwind CSS `peer` and `peer-invalid` variants. The `peer` class is applied to the input field, and a sibling element (a paragraph) uses `peer-invalid:visible` to show an error message when the input's state is invalid. This allows for dynamic UI updates without JavaScript.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/hover-focus-and-other-states.mdx#_snippet_22

LANGUAGE: jsx
CODE:

```
<div className="mx-auto max-w-md border-x border-x-gray-200 px-6 pt-6 pb-5 dark:border-x-gray-800 dark:bg-gray-950/10">
  <form>
    <div>
      <label htmlFor="email-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Email
      </label>
      <div className="mt-1">
        <input
          type="email"
          name="email"
          id="email-2"
          className="peer block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm invalid:border-pink-500 invalid:text-pink-600 focus:border-sky-500 focus:outline focus:outline-sky-500 focus:invalid:border-pink-500 focus:invalid:outline-pink-500 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 disabled:shadow-none sm:text-sm"
          defaultValue="george@krugerindustrial."
          placeholder="you@example.com"
        />
        <p className="invisible mt-2 text-sm text-pink-600 peer-invalid:visible">
          Please provide a valid email address.
        </p>
      </div>
    </div>
  </form>
</div>
```

LANGUAGE: html
CODE:

```
<!-- [!code classes:peer-invalid:visible] -->
<!-- [!code classes:peer] -->
<form>
  <label class="block">
    <span class="...">Email</span>
    <input type="email" class="peer ..." />
    <p class="invisible peer-invalid:visible ...">Please provide a valid email address.</p>
  </label>
</form>
```

---

TITLE: Defining Purple Oklch Color Palette in CSS
DESCRIPTION: This snippet defines a comprehensive set of purple color shades using CSS custom properties and the Oklch color model. These variables are essential for maintaining a unified purple color scheme across a project, facilitating easy updates and consistency.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/colors.mdx#_snippet_22

LANGUAGE: CSS
CODE:

```
--color-purple-50: oklch(0.977 0.014 308.299);
--color-purple-100: oklch(0.946 0.033 307.174);
--color-purple-200: oklch(0.902 0.063 306.703);
--color-purple-300: oklch(0.827 0.119 306.383);
--color-purple-400: oklch(0.714 0.203 305.504);
--color-purple-500: oklch(0.627 0.265 303.9);
--color-purple-600: oklch(0.558 0.288 302.321);
--color-purple-700: oklch(0.496 0.265 301.924);
--color-purple-800: oklch(0.438 0.218 303.724);
--color-purple-900: oklch(0.381 0.176 304.987);
--color-purple-950: oklch(0.291 0.149 302.717);
```

---

TITLE: Applying Dark Mode Styles to HTML Elements with Tailwind CSS
DESCRIPTION: This HTML snippet demonstrates how to apply dark mode specific styles using Tailwind CSS's `dark` variant. It shows how to change background colors (`dark:bg-gray-800`), text colors (`dark:text-white`, `dark:text-gray-400`), and other properties when the user's system is in dark mode. The `dark:` prefix conditionally applies the utility class based on the `prefers-color-scheme` media query.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/dark-mode.mdx#_snippet_0

LANGUAGE: HTML
CODE:

```
<!-- [!code word:dark\:bg-gray-800] -->
<!-- prettier-ignore -->
<div class="bg-white dark:bg-gray-800 rounded-lg px-6 py-8 ring shadow-xl ring-gray-900/5">
  <div>
    <span class="inline-flex items-center justify-center rounded-md bg-indigo-500 p-2 shadow-lg">
      <svg class="h-6 w-6 stroke-white" ...>
        <!-- ... -->
      </svg>
    </span>
  </div>
  <!-- prettier-ignore -->
  <!-- [!code word:dark\:text-white] -->
  <h3 class="text-gray-900 dark:text-white mt-5 text-base font-medium tracking-tight ">Writes upside-down</h3>
  <!-- prettier-ignore -->
  <!-- [!code word:dark\:text-gray-400] -->
  <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm ">
    The Zero Gravity Pen can be used to write in any orientation, including upside-down. It even works in outer space.
  </p>
</div>
```

---

TITLE: Displaying Sticky Time Labels in Calendar Grid (JSX)
DESCRIPTION: This `div` element is responsible for displaying the time labels (e.g., '5 PM') along the left edge of the calendar grid. It uses Tailwind CSS for sticky positioning (`sticky left-0`), grid placement (`col-start-1`, `row-start`), background (`bg-white`), padding, text alignment, font styling, and dark mode adaptations. The `uppercase` class ensures the time text is capitalized.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/overflow.mdx#_snippet_18

LANGUAGE: JSX
CODE:

```
<div className="sticky left-0 col-start-1 row-start-14 border-r border-gray-100 bg-white p-1.5 text-right text-xs font-medium text-gray-400 uppercase dark:border-gray-200/5 dark:bg-gray-800">\n          5 PM\n        </div>
```

---

TITLE: Incorrect Mobile Styling with sm:text-center - HTML
DESCRIPTION: This HTML snippet demonstrates a common mistake in Tailwind CSS responsive design. Using `sm:text-center` will only apply text centering on screens 640px and wider, failing to center text on smaller, mobile screens. It highlights that `sm:` targets the small breakpoint and above, not just small screens.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/responsive-design.mdx#_snippet_5

LANGUAGE: HTML
CODE:

```
<!-- This will only center text on screens 640px and wider, not on small screens -->
<div class="sm:text-center"></div>
```

---

TITLE: Sorting Tailwind CSS Classes with Prettier in HTML
DESCRIPTION: This snippet illustrates the automatic class sorting functionality provided by the official Prettier plugin for Tailwind CSS. It demonstrates how the plugin reorders utility classes within an HTML element's `class` attribute to follow a consistent and recommended order, improving readability and maintainability. The 'Before' state shows unsorted classes, while the 'After' state displays the same classes sorted by the plugin.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/editor-setup.mdx#_snippet_0

LANGUAGE: HTML
CODE:

```
<!-- Before -->
<button class="text-white px-4 sm:px-8 py-2 sm:py-3 bg-sky-700 hover:bg-sky-800">Submit</button>

<!-- After -->
<button class="bg-sky-700 px-4 py-2 text-white hover:bg-sky-800 sm:px-8 sm:py-3">Submit</button>
```

---

TITLE: Defining Tailwind CSS Color Palettes with OKLCH and Hex
DESCRIPTION: This snippet defines a comprehensive set of CSS custom properties for various color scales (gray, zinc, neutral, stone) using the OKLCH color model, along with standard black and white in hex. These variables are designed for use in CSS, particularly within frameworks like Tailwind CSS, allowing for consistent and reusable color definitions across a project. They can be remapped or reused under different names.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/colors.mdx#_snippet_28

LANGUAGE: css
CODE:

```
--color-gray-500: oklch(0.551 0.027 264.364);
  --color-gray-600: oklch(0.446 0.03 256.802);
  --color-gray-700: oklch(0.373 0.034 259.733);
  --color-gray-800: oklch(0.278 0.033 256.848);
  --color-gray-900: oklch(0.21 0.034 264.665);
  --color-gray-950: oklch(0.13 0.028 261.692);

  --color-zinc-50: oklch(0.985 0 0);
  --color-zinc-100: oklch(0.967 0.001 286.375);
  --color-zinc-200: oklch(0.92 0.004 286.32);
  --color-zinc-300: oklch(0.871 0.006 286.286);
  --color-zinc-400: oklch(0.705 0.015 286.067);
  --color-zinc-500: oklch(0.552 0.016 285.938);
  --color-zinc-600: oklch(0.442 0.017 285.786);
  --color-zinc-700: oklch(0.37 0.013 285.805);
  --color-zinc-800: oklch(0.274 0.006 286.033);
  --color-zinc-900: oklch(0.21 0.006 285.885);
  --color-zinc-950: oklch(0.141 0.005 285.823);

  --color-neutral-50: oklch(0.985 0 0);
  --color-neutral-100: oklch(0.97 0 0);
  --color-neutral-200: oklch(0.922 0 0);
  --color-neutral-300: oklch(0.87 0 0);
  --color-neutral-400: oklch(0.708 0 0);
  --color-neutral-500: oklch(0.556 0 0);
  --color-neutral-600: oklch(0.439 0 0);
  --color-neutral-700: oklch(0.371 0 0);
  --color-neutral-800: oklch(0.269 0 0);
  --color-neutral-900: oklch(0.205 0 0);
  --color-neutral-950: oklch(0.145 0 0);

  --color-stone-50: oklch(0.985 0.001 106.423);
  --color-stone-100: oklch(0.97 0.001 106.424);
  --color-stone-200: oklch(0.923 0.003 48.717);
  --color-stone-300: oklch(0.869 0.005 56.366);
  --color-stone-400: oklch(0.709 0.01 56.259);
  --color-stone-500: oklch(0.553 0.013 58.071);
  --color-stone-600: oklch(0.444 0.011 73.639);
  --color-stone-700: oklch(0.374 0.01 67.558);
  --color-stone-800: oklch(0.268 0.007 34.298);
  --color-stone-900: oklch(0.216 0.006 56.043);
  --color-stone-950: oklch(0.147 0.004 49.25);

  --color-black: #000;
  --color-white: #fff;
```

---

TITLE: Using theme() Function for Breakpoints in Tailwind CSS v4
DESCRIPTION: Shows how to use the `theme()` function with CSS variable names for breakpoints in media queries, where direct CSS variables are not supported. This is the updated syntax for v4.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/upgrade-guide.mdx#_snippet_26

LANGUAGE: CSS
CODE:

```
@media (width >= theme(--breakpoint-xl)) {
  /* ... */
}
```

---

TITLE: Applying Multi-Line Text Truncation with Tailwind CSS
DESCRIPTION: Demonstrates how to use the `line-clamp-3` utility class in Tailwind CSS to truncate text after three lines. This utility is now built directly into the framework, eliminating the need for a separate plugin and simplifying multi-line text truncation.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/blog/tailwindcss-v3-3/index.mdx#_snippet_22

LANGUAGE: HTML
CODE:

```
<div className="px-4 sm:px-0">
  <article className="mx-auto max-w-sm bg-white p-8 text-sm leading-6 text-slate-700 shadow-xl sm:text-base sm:leading-7 dark:bg-slate-800 dark:text-slate-400">
    <time dateTime="2020-03-16" className="block text-sm leading-6 text-slate-500 dark:text-slate-400">
      Mar 10, 2020
    </time>
    <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-200">Boost your conversion rate</h2>
    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
      <>
        Nulla dolor velit adipisicing duis excepteur esse in duis nostrud occaecat mollit incididunt deserunt sunt.
        Ut ut sunt laborum ex occaecat eu tempor labore enim adipisicing minim ad. Est in quis eu dolore occaecat
        excepteur fugiat dolore nisi aliqua fugiat enim ut cillum. Labore enim duis nostrud eu. Est ut eiusmod
        consequat irure quis deserunt ex. Enim laboris dolor magna pariatur. Dolor et ad sint voluptate sunt elit
        mollit officia ad enim sit consectetur enim.
      </>
    </p>
    <div className="mt-4 flex gap-x-2.5 text-sm leading-6 font-semibold text-slate-900 dark:text-slate-200">
      <img
        className="h-6 w-6 flex-none rounded-full bg-slate-50 dark:bg-slate-900"
        src="https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        alt=""
      />
      <>Lindsay Walton</>
    </div>
  </article>
</div>
```

LANGUAGE: HTML
CODE:

```
<article>
  <div>
    <time datetime="2020-03-16" class="block text-sm/6 text-gray-600">Mar 10, 2020</time>
    <h2 class="mt-2 text-lg font-semibold text-gray-900">Boost your conversion rate</h2>
    >
    <p class="mt-4 line-clamp-3 text-sm/6 text-gray-600">
      Nulla dolor velit adipisicing duis excepteur esse in duis nostrud occaecat mollit incididunt deserunt sunt. Ut ut
      sunt laborum ex occaecat eu tempor labore enim adipisicing minim ad. Est in quis eu dolore occaecat excepteur
      fugiat dolore nisi aliqua fugiat enim ut cillum. Labore enim duis nostrud eu. Est ut eiusmod consequat irure quis
      deserunt ex. Enim laboris dolor magna pariatur. Dolor et ad sint voluptate sunt elit mollit officia ad enim sit
      consectetur enim.
    </p>
  </div>
  <div class="mt-4 flex gap-x-2.5 text-sm leading-6 font-semibold text-gray-900">
    <img src="..." class="h-6 w-6 flex-none rounded-full bg-gray-50" />
    Lindsay Walton
  </div>
</article>
```

---

TITLE: Using Arbitrary Peer Variants with Custom Selectors
DESCRIPTION: Illustrates how to create one-off 'peer-\*' variants using arbitrary values by providing a custom CSS selector within square brackets, such as 'peer-[.is-dirty]'. This allows styling based on a peer's state combined with an arbitrary class or attribute.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/hover-focus-and-other-states.mdx#_snippet_25

LANGUAGE: html
CODE:

```
<form>
  <label for="email">Email:</label>
  <input id="email" name="email" type="email" class="is-dirty peer" required />
  <div class="peer-[.is-dirty]:peer-required:block hidden">This field is required.</div>
  <!-- ... -->
</form>
```

LANGUAGE: css
CODE:

```
.peer-\[\.is-dirty\]\:peer-required\:block {
  &:is(:where(.peer):is(.is-dirty) ~ *) {
    &:is(:where(.peer):required ~ *) {
      display: block;
    }
  }
}
```

---

TITLE: Customize Tailwind CSS Theme with @theme Directive
DESCRIPTION: Demonstrates how to customize design tokens like fonts, breakpoints, colors, and easing functions in Tailwind CSS using the @theme directive in your CSS file. This allows for global design system adjustments.
SOURCE: https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/adding-custom-styles.mdx#_snippet_0

LANGUAGE: css
CODE:

```
@theme {
  --font-display: "Satoshi", "sans-serif";

  --breakpoint-3xl: 120rem;

  --color-avocado-100: oklch(0.99 0 0);
  --color-avocado-200: oklch(0.98 0.04 113.22);
  --color-avocado-300: oklch(0.94 0.11 115.03);
  --color-avocado-400: oklch(0.92 0.19 114.08);
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --color-avocado-600: oklch(0.53 0.12 118.34);

  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);

  /* ... */
}
```
