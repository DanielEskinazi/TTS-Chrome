TITLE: Testing Exact Equality with Jest toBe (JavaScript)
DESCRIPTION: This snippet demonstrates the basic usage of Jest's `toBe` matcher to test for exact equality between two primitive values. It uses `Object.is` internally for comparison. The `expect` function creates an expectation object, and `toBe` is called on it with the expected value.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.5/UsingMatchers.md#_snippet_0

LANGUAGE: javascript
CODE:

```
test('two plus two is four', () => {
  expect(2 + 2).toBe(4);
});
```

---

TITLE: Writing a basic Jest test for sum function
DESCRIPTION: This JavaScript test file imports the `sum` function and uses Jest's `test`, `expect`, and `toBe` matchers to verify that `sum(1, 2)` correctly returns `3`.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/GettingStarted.md#_snippet_2

LANGUAGE: javascript
CODE:

```
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

---

TITLE: Writing a Basic Jest Test for Sum Function
DESCRIPTION: This test file imports the `sum` function and uses Jest's `test` global to define a test case. It asserts that calling `sum(1, 2)` should `toBe` exactly `3`, demonstrating a basic assertion with `expect`.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/GettingStarted.md#_snippet_2

LANGUAGE: javascript
CODE:

```
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

---

TITLE: Writing a Basic Jest Test for a Sum Function
DESCRIPTION: This JavaScript test file imports the `sum` function and uses Jest's `test` and `expect` functions to verify that `sum(1, 2)` correctly returns `3`. It demonstrates a fundamental Jest test structure.
SOURCE: https://github.com/jestjs/jest/blob/main/README.md#_snippet_3

LANGUAGE: javascript
CODE:

```
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

---

TITLE: Testing Exact Equality with `toBe` in Jest
DESCRIPTION: This snippet demonstrates the basic usage of Jest's `toBe` matcher to test for exact equality. It uses `Object.is` internally for comparison. This is suitable for primitive values like numbers.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/UsingMatchers.md#_snippet_0

LANGUAGE: js
CODE:

```
test('two plus two is four', () => {
  expect(2 + 2).toBe(4);
});
```

---

TITLE: Defining Synchronous Tests with test() in Jest
DESCRIPTION: This example demonstrates the basic usage of the `test` method (also aliased as `it`) for defining a synchronous test. It takes a descriptive name and a function containing the assertions, optionally accepting a timeout parameter to limit execution time.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.5/GlobalAPI.md#_snippet_15

LANGUAGE: JavaScript
CODE:

```
test('did not rain', () => {
  expect(inchesOfRain()).toBe(0);
});
```

---

TITLE: Running All Jest Tests (Default) - Bash
DESCRIPTION: Executes all test suites found in the project. This is the default behavior when running Jest without any specific arguments, providing a quick way to run your entire test suite.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/CLI.md#_snippet_0

LANGUAGE: bash
CODE:

```
jest
```

---

TITLE: Installing Jest with npm
DESCRIPTION: Installs the Jest testing framework as a development dependency in your project using npm. This command adds Jest to your `package.json`'s `devDependencies`, making it available for running tests during development.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/GettingStarted.md#_snippet_0

LANGUAGE: bash
CODE:

```
npm install --save-dev jest
```

---

TITLE: Creating Mock Functions with `jest.fn` in JavaScript
DESCRIPTION: The `jest.fn()` function returns a new, unused mock function that can be used to track calls, arguments, and return values. It can optionally take a mock implementation function, allowing you to define custom behavior for the mock.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/JestObjectAPI.md#_snippet_24

LANGUAGE: JavaScript
CODE:

```
const mockFn = jest.fn();
mockFn();
expect(mockFn).toHaveBeenCalled();
```

LANGUAGE: JavaScript
CODE:

```
const returnsTrue = jest.fn(() => true);
console.log(returnsTrue()); // true;
```

---

TITLE: Repeating Setup with beforeEach and afterEach in Jest
DESCRIPTION: This snippet demonstrates how to use `beforeEach` and `afterEach` hooks in Jest to perform setup and teardown operations that need to run before and after every test. It initializes and clears a city database for each test, ensuring a clean state. The `test` blocks then verify specific city data.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/SetupAndTeardown.md#_snippet_0

LANGUAGE: js
CODE:

```
beforeEach(() => {
  initializeCityDatabase();
});

afterEach(() => {
  clearCityDatabase();
});

test('city database has Vienna', () => {
  expect(isCity('Vienna')).toBeTruthy();
});

test('city database has San Juan', () => {
  expect(isCity('San Juan')).toBeTruthy();
});
```

---

TITLE: Generating Jest Configuration File
DESCRIPTION: Initializes a basic Jest configuration file (`jest.config.js`) by prompting the user for project-specific settings, streamlining the setup process.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/GettingStarted.md#_snippet_6

LANGUAGE: bash
CODE:

```
jest --init
```

---

TITLE: Defining a Basic Test Case with Jest's test
DESCRIPTION: This snippet illustrates the fundamental usage of the `test` method (or `it` alias) in Jest to define a single test case. It takes a descriptive name and a function containing the test's assertions. This is the simplest form of a Jest test, verifying a basic expectation.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/GlobalAPI.md#_snippet_15

LANGUAGE: js
CODE:

```
test('did not rain', () => {
  expect(inchesOfRain()).toBe(0);
});
```

---

TITLE: Testing Exact Equality with Jest's toBe Matcher (JavaScript)
DESCRIPTION: This snippet demonstrates the basic usage of Jest's `toBe` matcher to test for exact equality. It uses `Object.is` for comparison. This is suitable for primitive values like numbers, booleans, and strings.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/UsingMatchers.md#_snippet_0

LANGUAGE: js
CODE:

```
test('two plus two is four', () => {
  expect(2 + 2).toBe(4);
});
```

---

TITLE: Mocking Functions with `jest.fn` in TypeScript
DESCRIPTION: This snippet demonstrates how `jest.fn` infers types when an implementation is provided, ensuring type safety. It shows how to create a mock function, use `mockImplementation` to define its behavior, and then assert its calls within a test.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/MockFunctionAPI.md#_snippet_23

LANGUAGE: TypeScript
CODE:

```
import {expect, jest, test} from '@jest/globals';
import type add from './add';
import calculate from './calc';

test('calculate calls add', () => {
  // Create a new mock that can be used in place of `add`.
  const mockAdd = jest.fn<typeof add>();

  // `.mockImplementation()` now can infer that `a` and `b` are `number`
  // and that the returned value is a `number`.
  mockAdd.mockImplementation((a, b) => {
    // Yes, this mock is still adding two numbers but imagine this
    // was a complex function we are mocking.
    return a + b;
  });

  // `mockAdd` is properly typed and therefore accepted by anything
  // requiring `add`.
  calculate(mockAdd, 1, 2);

  expect(mockAdd).toHaveBeenCalledTimes(1);
  expect(mockAdd).toHaveBeenCalledWith(1, 2);
});
```

---

TITLE: Configuring Jest Test Script in package.json
DESCRIPTION: This JSON snippet adds a `test` script to the `scripts` section of `package.json`, allowing Jest tests to be run conveniently using `npm test` or `yarn test`. This standard configuration simplifies test execution.
SOURCE: https://github.com/jestjs/jest/blob/main/README.md#_snippet_4

LANGUAGE: json
CODE:

```
{
  "scripts": {
    "test": "jest"
  }
}
```

---

TITLE: Running Specific Tests with `test.only` in Jest
DESCRIPTION: This snippet demonstrates how to use `test.only` to execute only a specific test within a test file. This is particularly useful during debugging to isolate and focus on a single test case, while all other tests in the file will be skipped.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/GlobalAPI.md#_snippet_29

LANGUAGE: javascript
CODE:

```
test.only('it is raining', () => {
  expect(inchesOfRain()).toBeGreaterThan(0);
});

test('it is not snowing', () => {
  expect(inchesOfSnow()).toBe(0);
});
```

---

TITLE: Testing Users Class with Mocked Axios - JavaScript
DESCRIPTION: Tests the `Users.all()` method by mocking the `axios` module using `jest.mock()`. It sets up a `mockResolvedValue` for `axios.get` to return predefined user data, ensuring the test doesn't make actual API calls. Demonstrates asserting against the returned data.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/MockFunctions.md#_snippet_7

LANGUAGE: JavaScript
CODE:

```
import axios from 'axios';
import Users from './users';

jest.mock('axios');

test('should fetch users', () => {
  const users = [{name: 'Bob'}];
  const resp = {data: users};
  axios.get.mockResolvedValue(resp);

  // or you could use the following depending on your use case:
  // axios.get.mockImplementation(() => Promise.resolve(resp))

  return Users.all().then(data => expect(data).toEqual(users));
});
```

---

TITLE: Debugging Jest Tests with Node.js CLI
DESCRIPTION: This command runs Jest in a Node.js process with the debugger enabled, pausing execution until an external debugger connects. The `--runInBand` option ensures tests run in a single process, simplifying debugging. It's applicable for both Linux/macOS and Windows environments.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/Troubleshooting.md#_snippet_0

LANGUAGE: bash
CODE:

```
node --inspect-brk node_modules/.bin/jest --runInBand [any other arguments here]
or on Windows
node --inspect-brk ./node_modules/jest/bin/jest.js --runInBand [any other arguments here]
```

---

TITLE: Defining a Basic Synchronous Test with Jest
DESCRIPTION: This snippet shows the fundamental usage of the `test` method (or `it`) to define a synchronous test. It takes a test name and a function containing assertions. This is the simplest form of a Jest test, ensuring a specific condition is met.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/GlobalAPI.md#_snippet_13

LANGUAGE: JavaScript
CODE:

```
test('did not rain', () => {
  expect(inchesOfRain()).toBe(0);
});
```

---

TITLE: Defining Basic Test Cases with Jest's test
DESCRIPTION: This snippet demonstrates the fundamental `test` method (also aliased as `it`) for defining a single test case. It takes a test name and a function containing the assertions, with an optional third argument for a timeout in milliseconds.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/GlobalAPI.md#_snippet_15

LANGUAGE: js
CODE:

```
test('did not rain', () => {
  expect(inchesOfRain()).toBe(0);
});
```

---

TITLE: Asserting Mock Function Arguments: Jest .toHaveBeenCalledWith()
DESCRIPTION: This matcher ensures that a mock function was called with specific arguments. The arguments are compared using the same deep equality algorithm as `.toEqual()`. The example demonstrates verifying that a function `f` was called with a specific `beverage` object.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/ExpectAPI.md#_snippet_9

LANGUAGE: JavaScript
CODE:

```
test('registration applies correctly to orange La Croix', () => {
  const beverage = new LaCroix('orange');
  register(beverage);
  const f = jest.fn();
  applyToAll(f);
  expect(f).toHaveBeenCalledWith(beverage);
});
```

---

TITLE: Testing Promise Rejection with .catch and expect.assertions
DESCRIPTION: This snippet shows how to test a promise that is expected to be rejected. It uses the `.catch` method to handle the error and asserts the error message. `expect.assertions(1)` is crucial here to ensure that the assertion inside the `.catch` block is actually executed, preventing a false positive if the promise fulfills instead of rejects.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/TestingAsyncCode.md#_snippet_3

LANGUAGE: js
CODE:

```
test('the fetch fails with an error', () => {
  expect.assertions(1);
  return fetchData().catch(error => expect(error).toMatch('error'));
});
```

---

TITLE: Configuring Jest Test Script in package.json
DESCRIPTION: Adds a `test` script to the `scripts` section of `package.json`. This allows running Jest tests by simply executing `npm test` or `yarn test` from the command line, simplifying the test execution process for developers.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/GettingStarted.md#_snippet_3

LANGUAGE: json
CODE:

```
{
  "scripts": {
    "test": "jest"
  }
}
```

---

TITLE: Asserting Jest Mock Function Call Details - JavaScript
DESCRIPTION: This code demonstrates various Jest assertions using the `.mock` property to verify how a mock function was called. It shows how to check the call count, arguments passed, return values, `this` context, instances created, and the arguments of the last call, enabling comprehensive testing.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/MockFunctions.md#_snippet_3

LANGUAGE: javascript
CODE:

```
// The function was called exactly once
expect(someMockFunction.mock.calls).toHaveLength(1);

// The first arg of the first call to the function was 'first arg'
expect(someMockFunction.mock.calls[0][0]).toBe('first arg');

// The second arg of the first call to the function was 'second arg'
expect(someMockFunction.mock.calls[0][1]).toBe('second arg');

// The return value of the first call to the function was 'return value'
expect(someMockFunction.mock.results[0].value).toBe('return value');

// The function was called with a certain `this` context: the `element` object.
expect(someMockFunction.mock.contexts[0]).toBe(element);

// This function was instantiated exactly twice
expect(someMockFunction.mock.instances.length).toBe(2);

// The object returned by the first instantiation of this function
// had a `name` property whose value was set to 'test'
expect(someMockFunction.mock.instances[0].name).toBe('test');

// The first argument of the last call to the function was 'test'
expect(someMockFunction.mock.lastCall[0]).toBe('test');
```

---

TITLE: Testing Promise Rejection with .rejects in Jest
DESCRIPTION: This snippet demonstrates testing promise rejection using `await` and Jest's `.rejects` matcher. This provides a clean way to assert that a promise rejects with a specific error or pattern.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/TestingAsyncCode.md#_snippet_4

LANGUAGE: js
CODE:

```
test('the fetch fails with an error', async () => {
  await expect(fetchData()).rejects.toMatch('error');
});
```

---

TITLE: Running All Tests with Jest CLI
DESCRIPTION: This command executes all test suites found in the project. It is the default behavior when running Jest without any specific arguments.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.5/CLI.md#_snippet_0

LANGUAGE: bash
CODE:

```
jest
```

---

TITLE: Generating Basic Jest Configuration File
DESCRIPTION: Initializes a basic Jest configuration file interactively. This command prompts the user with questions about their project setup and generates a `jest.config.js` file with default settings and helpful descriptions for each option.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/GettingStarted.md#_snippet_6

LANGUAGE: bash
CODE:

```
npm init jest@latest
```

---

TITLE: Testing Asynchronous Functions with async/await in Jest
DESCRIPTION: This Jest test suite demonstrates writing asynchronous tests using async/await syntax. It covers both directly awaiting a Promise's resolution and combining await with the .resolves matcher for cleaner assertions on fulfilled Promises.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/TutorialAsync.md#_snippet_5

LANGUAGE: js
CODE:

```
// async/await can be used.
it('works with async/await', async () => {
  expect.assertions(1);
  const data = await user.getUserName(4);
  expect(data).toBe('Mark');
});

// async/await can also be used with `.resolves`.
it('works with async/await and resolves', async () => {
  expect.assertions(1);
  await expect(user.getUserName(5)).resolves.toBe('Paul');
});
```

---

TITLE: Writing a Basic Jest Test for Sum Function
DESCRIPTION: Imports the `sum` function and writes a Jest test case. It uses `test()` to define a test, `expect()` to assert a value, and `toBe()` as a matcher to check for exact equality, verifying that `sum(1, 2)` correctly equals 3.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/GettingStarted.md#_snippet_2

LANGUAGE: javascript
CODE:

```
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

---

TITLE: Running Specific Tests by Pattern or Filename with Jest CLI
DESCRIPTION: This command allows running only a subset of tests by providing a pattern or a direct file path. Jest will execute tests whose filenames or paths match the provided argument, enabling focused testing.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/CLI.md#_snippet_1

LANGUAGE: bash
CODE:

```
jest my-test #or
jest path/to/my-test.js
```

---

TITLE: Testing Asynchronous Code with Promises in Jest
DESCRIPTION: This snippet demonstrates how Jest waits for a returned promise to resolve. The test will pass if the promise resolves with the expected data ('peanut butter') and fail if it rejects or resolves with a different value.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/TestingAsyncCode.md#_snippet_0

LANGUAGE: JavaScript
CODE:

```
test('the data is peanut butter', () => {
  return fetchData().then(data => {
    expect(data).toBe('peanut butter');
  });
});
```

---

TITLE: Installing @testing-library/react
DESCRIPTION: This command installs the `@testing-library/react` package as a development dependency. It is used for DOM testing of React components, providing utilities to query and interact with rendered components.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/TutorialReact.md#_snippet_12

LANGUAGE: bash
CODE:

```
npm install --save-dev @testing-library/react
```

---

TITLE: Illustrating Jest Hook Execution Order
DESCRIPTION: This snippet provides a clear illustration of the execution order for Jest's `beforeAll`, `afterAll`, `beforeEach`, and `afterEach` hooks, including how they interact when nested within `describe` blocks. It helps in understanding the flow of setup and teardown operations in complex test suites.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.5/SetupAndTeardown.md#_snippet_4

LANGUAGE: JavaScript
CODE:

```
beforeAll(() => console.log('1 - beforeAll'));
afterAll(() => console.log('1 - afterAll'));
beforeEach(() => console.log('1 - beforeEach'));
afterEach(() => console.log('1 - afterEach'));

test('', () => console.log('1 - test'));

describe('Scoped / Nested block', () => {
  beforeAll(() => console.log('2 - beforeAll'));
  afterAll(() => console.log('2 - afterAll'));
  beforeEach(() => console.log('2 - beforeEach'));
  afterEach(() => console.log('2 - afterEach'));

  test('', () => console.log('2 - test'));
});

// 1 - beforeAll
// 1 - beforeEach
// 1 - test
// 1 - afterEach
// 2 - beforeAll
// 1 - beforeEach
// 2 - beforeEach
// 2 - test
// 2 - afterEach
// 1 - afterEach
// 2 - afterAll
// 1 - afterAll
```

---

TITLE: Handling Asynchronous beforeEach with Promises in Jest
DESCRIPTION: This example shows how beforeEach can handle asynchronous setup by returning a Promise. If initializeCityDatabase() returns a promise, Jest will wait for that promise to resolve before proceeding with the tests, ensuring the database is fully initialized.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/SetupAndTeardown.md#_snippet_1

LANGUAGE: JavaScript
CODE:

```
beforeEach(() => {
  return initializeCityDatabase();
});
```

---

TITLE: Testing Resolved Promises with Jest's .resolves (JavaScript)
DESCRIPTION: This snippet demonstrates how to use Jest's `.resolves` matcher to assert that a promise resolves to a specific value. It's crucial to `return` the `expect` statement to ensure Jest waits for the promise to settle before the test completes, preventing false positives.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/TestingAsyncCode.md#_snippet_8

LANGUAGE: js
CODE:

```
test('the data is peanut butter', () => {
  return expect(fetchData()).resolves.toBe('peanut butter');
});
```

---

TITLE: Testing jQuery DOM Manipulation with Jest and Mocks
DESCRIPTION: This Jest test file demonstrates how to test the `displayUser.js` module, which manipulates the DOM. It sets up a mock for `fetchCurrentUser` to control asynchronous data, initializes a basic DOM structure in `document.body.innerHTML`, and then simulates a click event on the button using jQuery. Finally, it asserts that `fetchCurrentUser` was called and the `#username` span's text was updated correctly. It relies on `jest.mock` and `jest-environment-jsdom`.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/TutorialjQuery.md#_snippet_1

LANGUAGE: javascript
CODE:

```
'use strict';

jest.mock('../fetchCurrentUser');

test('displays a user after a click', () => {
  // Set up our document body
  document.body.innerHTML =
    '<div>' +
    '  <span id="username" />' +
    '  <button id="button" />' +
    '</div>';

  // This module has a side-effect
  require('../displayUser');

  const $ = require('jquery');
  const fetchCurrentUser = require('../fetchCurrentUser');

  // Tell the fetchCurrentUser mock function to automatically invoke
  // its callback with some data
  fetchCurrentUser.mockImplementation(cb => {
    cb({
      fullName: 'Johnny Cash',
      loggedIn: true
    });
  });

  // Use jquery to emulate a click on our button
  $('#button').click();

  // Assert that the fetchCurrentUser function was called, and that the
  // #username span's inner text was updated as we'd expect it to.
  expect(fetchCurrentUser).toHaveBeenCalled();
  expect($('#username').text()).toBe('Johnny Cash - Logged In');
});
```

---

TITLE: Testing Object Equality with Jest's toEqual Matcher (JavaScript)
DESCRIPTION: This example illustrates how to use Jest's `toEqual` matcher for recursively checking the equality of objects or arrays. Unlike `toBe`, `toEqual` performs a deep comparison of all fields, making it suitable for complex data structures. It ignores `undefined` properties, array sparseness, or object type mismatch, for which `toStrictEqual` should be used.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/UsingMatchers.md#_snippet_1

LANGUAGE: js
CODE:

```
test('object assignment', () => {
  const data = {one: 1};
  data['two'] = 2;
  expect(data).toEqual({one: 1, two: 2});
});
```

---

TITLE: Updating All Jest Snapshots (Bash)
DESCRIPTION: This Bash command is used to update all failing Jest snapshot artifacts. Running `jest --updateSnapshot` (or its shorthand `jest -u`) instructs Jest to re-generate and save new snapshots for any tests whose output no longer matches their stored artifacts, typically after intentional component or UI changes.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/SnapshotTesting.md#_snippet_3

LANGUAGE: bash
CODE:

```
jest --updateSnapshot
```

---

TITLE: Testing Async Functionality with Promises in Jest
DESCRIPTION: This Jest test demonstrates how to test asynchronous functions that return Promises. It uses `jest.mock` to apply a manual mock and returns the Promise from the test function, ensuring Jest waits for its resolution. `expect.assertions(1)` verifies that at least one assertion is called within the promise chain.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/TutorialAsync.md#_snippet_3

LANGUAGE: JavaScript
CODE:

```
jest.mock('../request');

import * as user from '../user';

// The assertion for a promise must be returned.
it('works with promises', () => {
  expect.assertions(1);
  return user.getUserName(4).then(data => expect(data).toBe('Mark'));
});
```

---

TITLE: Testing a Function's Return Value with Jest `expect` and `toBe` (JavaScript)
DESCRIPTION: This snippet demonstrates how to use Jest's `expect` function with the `toBe` matcher to assert that a function `bestLaCroixFlavor()` returns a specific string value, 'grapefruit'. It shows a basic synchronous test case.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.5/ExpectAPI.md#_snippet_0

LANGUAGE: JavaScript
CODE:

```
test('the best flavor is grapefruit', () => {
  expect(bestLaCroixFlavor()).toBe('grapefruit');
});
```

---

TITLE: Importing Jest Globals in TypeScript Test
DESCRIPTION: Demonstrates how to import Jest global APIs like `describe`, `expect`, and `test` from `@jest/globals` in a TypeScript test file. This approach provides explicit type definitions and avoids `no-undef` errors when using ESLint without specific environment configurations.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/GettingStarted.md#_snippet_15

LANGUAGE: typescript
CODE:

```
import {describe, expect, test} from '@jest/globals';
import {sum} from './sum';

describe('sum module', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });
});
```

---

TITLE: Importing Jest APIs in TypeScript
DESCRIPTION: This snippet demonstrates the explicit import statement required to use Jest APIs like `expect`, `jest`, and `test` in TypeScript files. This is crucial for the examples on this page to work as documented, and further setup details can be found in the Getting Started guide.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/_TypeScriptExamplesNote.md#_snippet_0

LANGUAGE: TypeScript
CODE:

```
import {expect, jest, test} from '@jest/globals';
```

---

TITLE: Setting Return Values for Mock Functions with mockReturnValue (TypeScript)
DESCRIPTION: Illustrates the use of `mockReturnValue` in TypeScript to define the return value of a mock function, with type annotations for clarity.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/MockFunctionAPI.md#_snippet_16

LANGUAGE: typescript
CODE:

```
import {jest} from '@jest/globals';

const mock = jest.fn<() => number>();

mock.mockReturnValue(42);
mock(); // 42

mock.mockReturnValue(43);
mock(); // 43
```

---

TITLE: Enabling Jest Watch Mode
DESCRIPTION: Starts Jest in watch mode, which automatically re-runs tests when relevant files change. `--watch` defaults to running tests for changed files, while `--watchAll` runs all tests on changes, providing continuous feedback during development.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/CLI.md#_snippet_5

LANGUAGE: bash
CODE:

```
jest --watch #runs jest -o by default
jest --watchAll #runs all tests
```

---

TITLE: Testing Async Function Resolution with Jest
DESCRIPTION: This snippet shows how to test asynchronous code using `async`/`await` syntax. The `await` keyword pauses execution until the `fetchData()` Promise resolves, allowing the `expect` assertion to be performed on the resolved data. The test passes if the assertion is successful.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/TestingAsyncCode.md#_snippet_1

LANGUAGE: js
CODE:

```
test('the data is peanut butter', async () => {
  const data = await fetchData();
  expect(data).toBe('peanut butter');
});
```

---

TITLE: Installing React Testing Library - npm Bash
DESCRIPTION: This command installs the `@testing-library/react` package as a development dependency. This library provides utilities for testing React components in a way that encourages good testing practices by interacting with components as a user would.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/TutorialReact.md#_snippet_12

LANGUAGE: bash
CODE:

```
npm install --save-dev @testing-library/react
```

---

TITLE: Testing Asynchronous Code with Async/Await in Jest
DESCRIPTION: This example shows how to use the async/await syntax for testing asynchronous operations. The 'async' keyword marks the test function, and 'await' pauses execution until the Promise resolves, simplifying asynchronous test logic and error handling with try...catch.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.5/TestingAsyncCode.md#_snippet_1

LANGUAGE: js
CODE:

```
test('the data is peanut butter', async () => {
  const data = await fetchData();
  expect(data).toBe('peanut butter');
});

test('the fetch fails with an error', async () => {
  expect.assertions(1);
  try {
    await fetchData();
  } catch (error) {
    expect(error).toMatch('error');
  }
});
```

---

TITLE: Grouping Related Tests with describe in Jest (JavaScript)
DESCRIPTION: This example illustrates the use of `describe` to group related tests for better organization and readability. It defines a `myBeverage` object and then groups two tests, 'is delicious' and 'is not sour', under the 'my beverage' description block. This helps in structuring test files logically.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/GlobalAPI.md#_snippet_4

LANGUAGE: javascript
CODE:

```
const myBeverage = {
  delicious: true,
  sour: false,
};

describe('my beverage', () => {
  test('is delicious', () => {
    expect(myBeverage.delicious).toBeTruthy();
  });

  test('is not sour', () => {
    expect(myBeverage.sour).toBeFalsy();
  });
});
```

---

TITLE: Running Only Changed Tests in Jest CLI
DESCRIPTION: Attempts to identify and run only tests associated with files that have changed in the current Git/Hg repository. This feature requires a static dependency graph to function correctly.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/CLI.md#_snippet_15

LANGUAGE: bash
CODE:

```
jest --onlyChanged
```

---

TITLE: Running All Tests with Jest CLI
DESCRIPTION: Executes all test suites found in the project. This is the default behavior when no specific patterns or options are provided, ensuring comprehensive test coverage.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/CLI.md#_snippet_0

LANGUAGE: bash
CODE:

```
jest
```

---

TITLE: Comparing Primitive Values and Object Properties with `.toBe` in Jest
DESCRIPTION: This snippet demonstrates using the `.toBe` matcher to compare primitive values (numbers and strings) and check referential identity of object instances. It asserts that the `ounces` property of the `can` object is 12 and its `name` property is 'pamplemousse'. `.toBe` uses `Object.is` for comparison.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/ExpectAPI.md#_snippet_6

LANGUAGE: js
CODE:

```
const can = {
  name: 'pamplemousse',
  ounces: 12,
};

describe('the can', () => {
  test('has 12 ounces', () => {
    expect(can.ounces).toBe(12);
  });

  test('has a sophisticated name', () => {
    expect(can.name).toBe('pamplemousse');
  });
});
```

---

TITLE: Using Jest Custom Matchers for Mock Functions - JavaScript
DESCRIPTION: This snippet demonstrates common custom matchers provided by Jest for asserting how mock functions have been called. It includes examples for checking if a mock was called, called with specific arguments, called with specific arguments on its last invocation, and for snapshotting mock calls and name. These matchers simplify assertions on the `.mock` property.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/MockFunctions.md#_snippet_17

LANGUAGE: javascript
CODE:

```
// The mock function was called at least once
expect(mockFunc).toHaveBeenCalled();

// The mock function was called at least once with the specified args
expect(mockFunc).toHaveBeenCalledWith(arg1, arg2);

// The last call to the mock function was called with the specified args
expect(mockFunc).toHaveBeenLastCalledWith(arg1, arg2);

// All calls and the name of the mock is written as a snapshot
expect(mockFunc).toMatchSnapshot();
```

---

TITLE: Testing forEach with Jest Mock Function - JavaScript
DESCRIPTION: This Jest test suite demonstrates how to use a mock function (`jest.fn`) to verify the behavior of the `forEach` utility. It asserts that the mock callback was invoked the correct number of times, with the expected arguments, and that its return values were as anticipated, showcasing the inspection of mock state.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/MockFunctions.md#_snippet_1

LANGUAGE: js
CODE:

```
const forEach = require('./forEach');

const mockCallback = jest.fn(x => 42 + x);

test('forEach mock function', () => {
  forEach([0, 1], mockCallback);

  // The mock function was called twice
  expect(mockCallback.mock.calls).toHaveLength(2);

  // The first argument of the first call to the function was 0
  expect(mockCallback.mock.calls[0][0]).toBe(0);

  // The first argument of the second call to the function was 1
  expect(mockCallback.mock.calls[1][0]).toBe(1);

  // The return value of the first call to the function was 42
  expect(mockCallback.mock.results[0].value).toBe(42);
});
```

---

TITLE: Running Specific Tests with `test.only` in Jest (JavaScript)
DESCRIPTION: This snippet demonstrates how to use `test.only` to execute only a specific test within a test file, which is useful for debugging. It prevents other tests in the same file from running. An optional `timeout` parameter can be provided to set a custom timeout for the test.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.5/GlobalAPI.md#_snippet_29

LANGUAGE: JavaScript
CODE:

```
test.only('it is raining', () => {
  expect(inchesOfRain()).toBeGreaterThan(0);
});

test('it is not snowing', () => {
  expect(inchesOfSnow()).toBe(0);
});
```

---

TITLE: Creating a Mock Function with Jest
DESCRIPTION: This function returns a new, unused mock function. It can optionally take an `implementation` function, which will be executed when the mock function is called. This is the primary way to create custom mock behaviors in Jest.
SOURCE: https://github.com/jestjs/jest/blob/main/docs/JestObjectAPI.md#_snippet_27

LANGUAGE: js
CODE:

```
const mockFn = jest.fn();
mockFn();
expect(mockFn).toHaveBeenCalled();
```

LANGUAGE: js
CODE:

```
// With a mock implementation:
const returnsTrue = jest.fn(() => true);
console.log(returnsTrue()); // true;
```

---

TITLE: Managing Resource Setup and Teardown with Jest Hooks in JavaScript
DESCRIPTION: This example illustrates the execution order of `beforeEach` and `afterEach` hooks in Jest, demonstrating how they are called in the order of declaration. It shows how to manage dependent resources, noting that `after*` hooks of the enclosing scope are called first.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/SetupAndTeardown.md#_snippet_6

LANGUAGE: JavaScript
CODE:

```
beforeEach(() => console.log('connection setup'));
beforeEach(() => console.log('database setup'));

afterEach(() => console.log('database teardown'));
afterEach(() => console.log('connection teardown'));

test('test 1', () => console.log('test 1'));

describe('extra', () => {
  beforeEach(() => console.log('extra database setup'));
  afterEach(() => console.log('extra database teardown'));

  test('test 2', () => console.log('test 2'));
});
```

---

TITLE: Writing a Basic Jest Test
DESCRIPTION: Creates a test file that imports the `sum` function and uses Jest's `test`, `expect`, and `toBe` matchers to verify its correctness, ensuring the function behaves as expected.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/GettingStarted.md#_snippet_2

LANGUAGE: javascript
CODE:

```
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

---

TITLE: Testing a Function's Return Value with Jest `expect` and `toBe`
DESCRIPTION: This snippet demonstrates the basic usage of `expect` with the `toBe` matcher in Jest to assert that the `bestLaCroixFlavor()` function returns the string 'grapefruit'. It shows how to define a test case and use `expect(value).toBe(expected)` for direct value comparison.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/ExpectAPI.md#_snippet_0

LANGUAGE: JavaScript
CODE:

```
test('the best flavor is grapefruit', () => {
  expect(bestLaCroixFlavor()).toBe('grapefruit');
});
```

---

TITLE: Using Jest Custom Matchers for Mock Functions - JavaScript
DESCRIPTION: This snippet demonstrates the use of Jest's built-in custom matchers for asserting how mock functions have been called. These matchers provide a concise and readable way to test mock interactions, such as checking if a mock was called, called with specific arguments, or if its last call matched certain arguments, and also for snapshotting mock calls.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.6/MockFunctions.md#_snippet_17

LANGUAGE: javascript
CODE:

```
// The mock function was called at least once
expect(mockFunc).toHaveBeenCalled();

// The mock function was called at least once with the specified args
expect(mockFunc).toHaveBeenCalledWith(arg1, arg2);

// The last call to the mock function was called with the specified args
expect(mockFunc).toHaveBeenLastCalledWith(arg1, arg2);

// All calls and the name of the mock is written as a snapshot
expect(mockFunc).toMatchSnapshot();
```

---

TITLE: Setting a Mock Function's Return Value (TypeScript)
DESCRIPTION: This TypeScript example illustrates setting a mock function's return value using `mockReturnValue` with type annotations. It demonstrates how to define the expected return type and dynamically change the value returned by the mock.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.7/MockFunctionAPI.md#_snippet_18

LANGUAGE: typescript
CODE:

```
import {jest} from '@jest/globals';

const mock = jest.fn<() => number>();

mock.mockReturnValue(42);
mock(); // 42

mock.mockReturnValue(43);
mock(); // 43
```

---

TITLE: Running Jest in Watch Mode - Bash
DESCRIPTION: Starts Jest in interactive watch mode, which re-runs tests when file changes are detected. `--watch` runs tests related to changed files, while `--watchAll` runs all tests, providing continuous feedback during development.
SOURCE: https://github.com/jestjs/jest/blob/main/website/versioned_docs/version-29.4/CLI.md#_snippet_5

LANGUAGE: bash
CODE:

```
jest --watch #runs jest -o by default
jest --watchAll #runs all tests
```
