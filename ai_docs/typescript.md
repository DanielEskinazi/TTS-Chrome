TITLE: Demonstrating Type Satisfaction with Property Constraints - TypeScript
DESCRIPTION: This snippet defines a `Keys` type and an object `p` that `satisfies` `Partial<Record<Keys, unknown>>`. It illustrates how `satisfies` ensures that `p` only contains properties defined in `Keys`, catching an error for the `x` property. It also shows that type inference for `a` and `b` is preserved, but accessing `p.d` (which is in `Keys` but not on `p`) results in an error.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/typeSatisfaction_propNameConstraining.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
type Keys = 'a' | 'b' | 'c' | 'd';

const p = {
    a: 0,
    b: "hello",
    x: 8 // Should error, 'x' isn't in 'Keys'
} satisfies Partial<Record<Keys, unknown>>;

// Should be OK -- retain info that a is number and b is string
let a = p.a.toFixed();
let b = p.b.substring(1);
// Should error even though 'd' is in 'Keys'
let d = p.d;
```

---

TITLE: Declaring React Component Base Class in TypeScript
DESCRIPTION: This snippet defines the base `Component` class within the `react` module's declaration file. It illustrates how TypeScript provides type definitions for React's core components, allowing for type checking of props (`T`) and state (`U`) in user-defined components.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/tsxDynamicTagName7.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
declare module 'react' {
	class Component<T, U> { }
}
```

---

TITLE: Instantiating React Component with Missing Required Properties (TS2739)
DESCRIPTION: This example attempts to instantiate `MyComp` without providing any of its required properties (`a` and `b`), leading to a TypeScript error `TS2739`. This error indicates that the type `{}` (inferred from no props) is missing properties from the expected `Prop` interface.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/tsxReactComponentWithDefaultTypeParameter3.errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
let x1 = <MyComp />
```

---

TITLE: Importing Undefined Module in app.ts (TypeScript)
DESCRIPTION: This snippet from 'app.ts' also shows a TS2307 error, similar to the one in 'lib.ts'. It highlights a common issue where a required module 'foo' is missing, leading to compilation failure. Resolution involves ensuring 'foo' is available in 'node_modules' or correctly mapped.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/cachedModuleResolution7.errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
import {x} from "foo";
```

---

TITLE: Calculating Area using Switch Statement with Discriminated Unions in TypeScript
DESCRIPTION: Calculates the area of a `Shape` using a `switch` statement on the `s.kind` property. This demonstrates another common pattern for type narrowing with discriminated unions, where each `case` branch correctly infers the specific type of `s`.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/discriminatedUnionTypes1.errors.txt#_snippet_2

LANGUAGE: TypeScript
CODE:

```
function area2(s: Shape) {
    switch (s.kind) {
        case "square": return s.size * s.size;
        case "rectangle": return s.width * s.height;
        case "circle": return Math.PI * s.radius * s.radius;
    }
}
```

---

TITLE: Demonstrating Object Type Narrowing with Truthy Checks in TypeScript
DESCRIPTION: This function illustrates various scenarios of type narrowing in TypeScript when `x` is of type `unknown` and checked for `typeof x === 'object'` combined with truthy checks. It highlights that `typeof x === 'object'` alone does not exclude `null`, leading to TS18047, but combining it with a truthy check (`x && typeof x === 'object'`) correctly narrows `x` to a non-null object.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/narrowingTruthyObject.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
function foo(x: unknown, b: boolean) {
    if (typeof x === 'object') {
        x.toString();
    }
    if (typeof x === 'object' && x) {
        x.toString();
    }
    if (x && typeof x === 'object') {
        x.toString();
    }
    if (b && x && typeof x === 'object') {
        x.toString();
    }
    if (x && b && typeof x === 'object') {
        x.toString();
    }
    if (x && b && b && typeof x === 'object') {
        x.toString();
    }
    if (b && b && x && b && b && typeof x === 'object') {
        x.toString();
    }
}
```

---

TITLE: Demonstrating Union Type Assignability and Errors in TypeScript
DESCRIPTION: This snippet defines classes C, D, and E (where D and E extend C and introduce unique methods foo1 and foo2 respectively), along with union types 'number | string' and 'D | E'. It then demonstrates various type assignments, highlighting both valid assignments and common TypeScript errors (TS2741, TS2322) that occur when assigning incompatible types or union types where not all constituent types are assignable to the target.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/unionTypesAssignability.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
var unionNumberString: number | string;
class C { }
class D extends C { foo1() { } }
class E extends C { foo2() { } }
var unionDE: D | E;

var num: number;
var str: string;
var c: C;
var d: D;
var e: E;

// A union type U is assignable to a type T if each type in U is assignable to T
c = d;
c = e;
c = unionDE; // ok
d = d;
d = e; // error TS2741: Property 'foo1' is missing in type 'E' but required in type 'D'.
d = unionDE; // error TS2322: Type 'D | E' is not assignable to type 'D'. Property 'foo1' is missing in type 'E' but required in type 'D'.
e = d; // error TS2741: Property 'foo2' is missing in type 'D' but required in type 'E'.
e = e;
e = unionDE; // error TS2322: Type 'D | E' is not assignable to type 'E'. Property 'foo2' is missing in type 'D' but required in type 'E'.
num = num;
num = str; // error TS2322: Type 'string' is not assignable to type 'number'.
num = unionNumberString; // error TS2322: Type 'string | number' is not assignable to type 'number'. Type 'string' is not assignable to type 'number'.
str = num; // error TS2322: Type 'number' is not assignable to type 'string'.
str = str;
str = unionNumberString; // error TS2322: Type 'string | number' is not assignable to type 'string'. Type 'number' is not assignable to type 'string'.

// A type T is assignable to a union type U if T is assignable to any type in U
d = c; // error TS2741: Property 'foo1' is missing in type 'C' but required in type 'D'.
e = c; // error TS2741: Property 'foo2' is missing in type 'C' but required in type 'E'.
```

---

TITLE: Assigning Structurally Compatible Types to Class S
DESCRIPTION: This snippet shows that an instance of class 'S' can be assigned values from an interface 'S2' and an object literal 'a2'. This highlights TypeScript's structural typing, where types are compatible if their members match, regardless of their nominal declaration (class, interface, or object literal).
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/assignmentCompatWithObjectMembers4.errors.txt#_snippet_5

LANGUAGE: TypeScript
CODE:

```
s = s2; // ok
s = a2; // ok
```

---

TITLE: Importing Module Causing TS2307 Error (just-types-versions)
DESCRIPTION: This TypeScript import statement illustrates a module path that triggers a TS2307 'Cannot find module' error, specifically for a module under 'just-types-versions'. This error signifies that the TypeScript compiler could not find the specified module or its type declarations.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/nodeModulesExportsBlocksTypesVersions(module=nodenext).errors.txt#_snippet_8

LANGUAGE: TypeScript
CODE:

```
import {} from "just-types-versions/foo";
```

---

TITLE: TypeScript: TS2339 Compilation Error Message
DESCRIPTION: The specific TypeScript compilation error TS2339, indicating that the property 'Ghost' does not exist on the type imported from 'intermediate'. This error occurs because `export type * from './ghost'` only re-exports the _type_ `Ghost`, not the _value_ (class constructor), making `new intermediate.Ghost()` invalid.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/exportNamespace11.errors.txt#_snippet_3

LANGUAGE: TypeScript Error
CODE:

```
main.ts(2,52): error TS2339: Property 'Ghost' does not exist on type 'typeof import("intermediate")'.
```

---

TITLE: IPromise.then with Correct String Promise Arguments (OK)
DESCRIPTION: This example shows a correct usage of `IPromise.then` where the `sIPromise` callbacks are properly assigned to the `then` method's parameters, ensuring type compatibility and no errors.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/promisePermutations3.errors.txt#_snippet_38

LANGUAGE: TypeScript
CODE:

```
var r9b = r9.then(sIPromise, sIPromise, sIPromise); // ok
```

---

TITLE: Incorrect TypeScript Module Resolution Configuration
DESCRIPTION: This `tsconfig.json` snippet illustrates a common error (TS5098) where module resolution options like `customConditions`, `resolvePackageJsonExports`, and `resolvePackageJsonImports` are used with an incompatible `moduleResolution` setting, specifically 'classic'. These options require `moduleResolution` to be 'node16', 'nodenext', or 'bundler' to function correctly.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/packageJsonExportsOptionsCompat.errors.txt#_snippet_0

LANGUAGE: JSON
CODE:

```
    {
      "compilerOptions": {
        "moduleResolution": "classic",
        "customConditions": ["webpack", "browser"],
        "resolvePackageJsonExports": true,
        "resolvePackageJsonImports": true,
        "noEmit": true
      }
    }
```

---

TITLE: Creating Object Types from Property Definitions in TypeScript
DESCRIPTION: This snippet defines a `PropDef` type for structured property definitions and a `TypeFromDefs` mapped type that constructs an object type from a union of `PropDef`s. It uses the `as` clause to map `P['name']` to the new property key and `P['type']` to its value, demonstrating how to build types from structured metadata. `TP1` shows how duplicate names are handled, with the last definition overriding previous ones.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/mappedTypeAsClauses.errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
type PropDef<K extends keyof any, T> = { name: K, type: T };

type TypeFromDefs<T extends PropDef<keyof any, any>> = { [P in T as P['name']]: P['type'] };

type TP1 = TypeFromDefs<{ name: 'a', type: string } | { name: 'b', type: number } | { name: 'a', type: boolean }>;
```

---

TITLE: Main Package.json Export Map Configuration
DESCRIPTION: This `package.json` defines the main package's metadata and its `exports` map. The `"type": "module"` indicates ESM default behavior. The `exports` field specifies how different subpaths (`./cjs`, `./mjs`, `.` for default) resolve to specific files, crucial for module resolution.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/nodeModulesAllowJsPackageExports(module=nodenext).errors.txt#_snippet_6

LANGUAGE: JSON
CODE:

```
{
        "name": "package",
        "private": true,
        "type": "module",
        "exports": {
            "./cjs": "./index.cjs",
            "./mjs": "./index.mjs",
            ".": "./index.js"
        }
    }
```

---

TITLE: Declaring Function with Implicit Any Parameter - TypeScript
DESCRIPTION: This snippet illustrates a TypeScript error (TS7006) where the parameter 'x' in the `foo` function implicitly receives an 'any' type because no explicit type annotation is provided. This occurs when the `noImplicitAny` compiler option is enabled, enforcing stricter type checking.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/implicitAnyDeclareFunctionWithoutFormalType.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
function foo(x) { };
```

---

TITLE: Correct React Component Prop Assignment Example
DESCRIPTION: This example demonstrates the correct way to pass props to the `Poisoned` component, satisfying the `PoisonedProp` interface by providing `x` as a string and `y` as the literal '2'. This usage results in no TypeScript errors.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/tsxSpreadAttributesResolution2.errors.txt#_snippet_1

LANGUAGE: TSX
CODE:

```
// OK
<Poisoned {...{x: "ok", y: "2"}} />;
```

---

TITLE: Array Destructuring with Default Values and Nested Arrays in TypeScript
DESCRIPTION: This TypeScript snippet demonstrates advanced array destructuring. It assigns a default value 'noName' to `nameMA` if the first array element is undefined. It also showcases nested destructuring, where `primarySkillA` and `secondarySkillA` are assigned values from a nested array, defaulting to `['skill1', 'skill2']` if the corresponding element is undefined. This pattern is useful for providing fallback values in complex data structures.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/sourceMapValidationDestructuringForOfArrayBindingPatternDefaultValues.sourcemap.txt#_snippet_56

LANGUAGE: TypeScript
CODE:

```
[nameMA = "noName", [primarySkillA = "primary", secondarySkillA = "secondary"] = ["skill1", "skill2"]]
```

---

TITLE: Defining InterfaceY in TypeScript
DESCRIPTION: This snippet defines a TypeScript interface named `InterfaceY`. Interfaces are used to describe the shape of objects, ensuring type safety. This interface declares a single method, `YisIn1_2`, which takes no arguments and returns void.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/typeResolution.sourcemap.txt#_snippet_70

LANGUAGE: TypeScript
CODE:

```
export interface InterfaceY { YisIn1_2(); }
```

---

TITLE: Declaring Variables, Classes, and Functions in TypeScript (m1.ts)
DESCRIPTION: This snippet from `m1.ts` demonstrates fundamental TypeScript syntax. It includes the declaration of a numeric variable `m1_a1`, a class `m1_c1` with a public number property `m1_c1_p1`, instantiation of `m1_c1`, and a function `m1_f1` that returns the class instance.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/project/mapRootSourceRootWithNoSourceMapOption/amd/mapRootSourceRootWithNoSourceMapOption.errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
    var m1_a1 = 10;
    class m1_c1 {
        public m1_c1_p1: number;
    }

    var m1_instance1 = new m1_c1();
    function m1_f1() {
        return m1_instance1;
    }
```

---

TITLE: Type Narrowing with Switch Statement and Mixed Control Flow in TypeScript
DESCRIPTION: Shows type narrowing in a `switch` statement with different control flow exits. If `m.kind` is "A", the function returns. If `m.kind` is "D", an error is thrown. After these branches, `m` is narrowed to only the remaining possible type: `{ kind: "B" | "C", y: number }`.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/discriminatedUnionTypes1.errors.txt#_snippet_14

LANGUAGE: TypeScript
CODE:

```
function f8(m: Message) {
    switch (m.kind) {
        case "A":
            return;
        case "D":
            throw new Error();
    }
    m;  // { kind: "B" | "C", y: number }
}
```

---

TITLE: Handling Missing Extensions in ECMAScript Imports (Node16/NodeNext)
DESCRIPTION: These snippets demonstrate TS2835 and TS2834 errors when using ECMAScript `import` statements with relative paths that lack explicit file extensions or refer to directories/implicit index files. This occurs when TypeScript's `--moduleResolution` is set to `node16` or `nodenext`, which requires full specifiers for ES modules. To resolve, add the `.js`, `.mjs`, or `.cjs` extension.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/nodeModules1(module=node18).errors.txt#_snippet_24

LANGUAGE: TypeScript
CODE:

```
import * as m18 from "./subfolder2";
import * as m19 from "./subfolder2/";
import * as m20 from "./subfolder2/index";
import * as m21 from "./subfolder2/another";
import * as m22 from "./subfolder2/another/";
import * as m23 from "./subfolder2/another/index";
```

---

TITLE: Logging a Variable in TypeScript
DESCRIPTION: This snippet uses `console.log` to output the value of the `primaryA` variable to the console. It's a standard debugging or output mechanism in JavaScript/TypeScript.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/sourceMapValidationDestructuringForObjectBindingPattern2.sourcemap.txt#_snippet_33

LANGUAGE: TypeScript
CODE:

```
console.log(primaryA);
```

---

TITLE: Define and use a generic 'merge' utility type in TypeScript
DESCRIPTION: This snippet defines a TypeScript utility type `merge` that combines two object types, `base` and `props`. If there are no common keys, it simply creates an intersection type (`base & props`). If common keys exist, it uses `Omit` to remove common keys from `base` before intersecting with `props`, effectively overwriting properties from `base` with those from `props`. It also declares a corresponding `merge` function that applies this type logic at runtime. The subsequent code demonstrates a long chain of object merging using this utility, which can lead to complex inferred types and potential `TS2339` errors if properties are accessed incorrectly or type inference becomes too deep.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/longObjectInstantiationChain3.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
export type merge<base, props> = keyof base & keyof props extends never
  ? base & props
  : Omit<base, keyof props & keyof base> & props;

declare const merge: <l, r>(l: l, r: r) => merge<l, r>;

const o1 = merge({ p1: 1 }, { p2: 2 });
const o2 = merge(o1, { p2: 2, p3: 3 });
const o3 = merge(o2, { p3: 3, p4: 4 });
const o4 = merge(o3, { p4: 4, p5: 5 });
const o5 = merge(o4, { p5: 5, p6: 6 });
const o6 = merge(o5, { p6: 6, p7: 7 });
const o7 = merge(o6, { p7: 7, p8: 8 });
const o8 = merge(o7, { p8: 8, p9: 9 });
const o9 = merge(o8, { p9: 9, p10: 10 });
const o10 = merge(o9, { p10: 10, p11: 11 });
const o11 = merge(o10, { p11: 11, p12: 12 });
const o12 = merge(o11, { p12: 12, p13: 13 });
const o13 = merge(o12, { p13: 13, p14: 14 });
const o14 = merge(o13, { p14: 14, p15: 15 });
const o15 = merge(o14, { p15: 15, p16: 16 });
const o16 = merge(o15, { p16: 16, p17: 17 });
const o17 = merge(o16, { p17: 17, p18: 18 });
const o18 = merge(o17, { p18: 18, p19: 19 });
const o19 = merge(o18, { p19: 19, p20: 20 });
const o20 = merge(o19, { p20: 20, p21: 21 });
const o21 = merge(o20, { p21: 21, p22: 22 });
const o22 = merge(o21, { p22: 22, p23: 23 });
const o23 = merge(o22, { p23: 23, p24: 24 });
const o24 = merge(o23, { p24: 24, p25: 25 });
const o25 = merge(o24, { p25: 25, p26: 26 });
const o26 = merge(o25, { p26: 26, p27: 27 });
const o27 = merge(o26, { p27: 27, p28: 28 });
const o28 = merge(o27, { p28: 28, p29: 29 });
const o29 = merge(o28, { p29: 29, p30: 30 });
const o30 = merge(o29, { p30: 30, p31: 31 });
const o31 = merge(o30, { p31: 31, p32: 32 });
const o32 = merge(o31, { p32: 32, p33: 33 });
```

---

TITLE: TypeScript Class Property Access Error Example (TS2339)
DESCRIPTION: This code snippet illustrates a TypeScript compilation error (TS2339) where a class method attempts to access 'this.y'. Although 'y' is a parameter in the constructor, it is not declared as a class property (e.g., via 'public y' or 'private y'), causing TypeScript to report that 'Property 'y' does not exist on type 'Foo'. This demonstrates the need for explicit property declaration for class members.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/propertyOrdering2.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
class Foo {
    constructor(public x, y) { }
       foo() {
        var a = this.x;
        return this.y;
    }
}
```

---

TITLE: Demonstrating Valid and Invalid Await Using Declarations in TypeScript
DESCRIPTION: This `async` function showcases both valid and invalid `await using` declarations. It successfully uses `AsyncIteratorObject` and `AsyncGenerator` as initializers, but fails when attempting to use a plain `AsyncIterator` because it lacks the necessary `[Symbol.asyncDispose]()` or `[Symbol.dispose]()` method, triggering TypeScript error TS2851: 'The initializer of an 'await using' declaration must be either an object with a '[Symbol.asyncDispose]()' or '[Symbol.dispose]()' method, or be 'null' or 'undefined.'.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/awaitUsingDeclarationsWithAsyncIteratorObject.errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
async function f() {
    // should pass
    await using it0 = aio;
    await using it1 = ag;

    // should fail
    await using it2 = ai;
}
```

---

TITLE: Root Package.json Configuration (JSON)
DESCRIPTION: This `package.json` configures the root package as an ECMAScript Module (`"type": "module"`). It defines `exports` to map internal paths (`./cjs`, `./mjs`, `.`) to their respective module files, facilitating consistent module resolution for consumers.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/nodeModulesDeclarationEmitWithPackageExports(module=node16).errors.txt#_snippet_8

LANGUAGE: JSON
CODE:

```
{
    "name": "package",
    "private": true,
    "type": "module",
    "exports": {
        "./cjs": "./index.cjs",
        "./mjs": "./index.mjs",
        ".": "./index.js"
    }
}
```

---

TITLE: Calculating Area with Exhaustive Switch and assertNever in TypeScript
DESCRIPTION: Calculates the area of a `Shape` using a `switch` statement, including a `default` case that calls `assertNever(s)`. This pattern ensures that all members of the `Shape` union are explicitly handled, providing a compile-time error if a new `Shape` type is added but not covered.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/discriminatedUnionTypes1.errors.txt#_snippet_4

LANGUAGE: TypeScript
CODE:

```
function area3(s: Shape) {
    switch (s.kind) {
        case "square": return s.size * s.size;
        case "rectangle": return s.width * s.height;
        case "circle": return Math.PI * s.radius * s.radius;
        default: return assertNever(s);
    }
}
```

---

TITLE: Multiple Implicit Any Parameters in Function - TypeScript
DESCRIPTION: This snippet shows how TypeScript generates multiple TS7006 errors when several parameters (a, b, c) in the `func2` function are declared without explicit type annotations, leading to implicit 'any' types for each.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/implicitAnyDeclareFunctionWithoutFormalType.errors.txt#_snippet_2

LANGUAGE: TypeScript
CODE:

```
function func2(a, b, c) { };
```

---

TITLE: Declaring Async Functions and Methods in TypeScript
DESCRIPTION: This snippet illustrates the diverse syntax for defining asynchronous operations using the 'async' keyword in TypeScript. It covers standard function declarations, function expressions, arrow functions, methods within object literals, instance and static methods in classes, and functions exported from modules. The examples also demonstrate how TypeScript infers return types as 'Promise<void>' or 'Promise<T>' and how to explicitly specify return types, including custom Promise-like types.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/asyncAwaitIsolatedModules_es5.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
import { MyPromise } from "missing";

declare var p: Promise<number>;
declare var mp: MyPromise<number>;

async function f0() { }
async function f1(): Promise<void> { }
async function f3(): MyPromise<void> { }

let f4 = async function() { }
let f5 = async function(): Promise<void> { }
let f6 = async function(): MyPromise<void> { }

let f7 = async () => { };
let f8 = async (): Promise<void> => { };
let f9 = async (): MyPromise<void> => { };
let f10 = async () => p;
let f11 = async () => mp;
let f12 = async (): Promise<number> => mp;
let f13 = async (): MyPromise<number> => p;

let o = {
	async m1() { },
	async m2(): Promise<void> { },
	async m3(): MyPromise<void> { }
};

class C {
	async m1() { }
	async m2(): Promise<void> { }
	async m3(): MyPromise<void> { }
	static async m4() { }
	static async m5(): Promise<void> { }
	static async m6(): MyPromise<void> { }
}

module M {
	export async function f1() { }
}
```

---

TITLE: Incorrect Usage of `MeetAndGreet` Component (Missing Required Prop) in TypeScript JSX
DESCRIPTION: This snippet shows a `TS2741` error because the required `prop-name` is missing when using `MeetAndGreet`. Instead, an `extra-prop-name` is provided, which is not recognized by the component's type definition.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/tsxStatelessFunctionComponents1.errors.txt#_snippet_10

LANGUAGE: TypeScript
CODE:

```
let h = <MeetAndGreet extra-prop-name="World" />;
```

---

TITLE: Demonstrating 'this' Context Issue in Array.prototype.find (TypeScript)
DESCRIPTION: This method illustrates a common 'this' context problem in TypeScript when using Array.prototype.find with a traditional 'function' expression. Inside the callback, 'this' refers to the global object (or 'undefined' in strict mode) instead of the 'Test' instance, leading to a TS2683 error. It highlights the need to explicitly bind 'this' or use arrow functions.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/thisInFunctionCall.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
finderRaw() {
  this.data.find(function (d) {
    return d === this.data.length
  })
}
```

---

TITLE: Configuring Module Exports and Types Versions in package.json
DESCRIPTION: Defines a package.json file demonstrating various configurations for 'exports' and 'typesVersions' fields. It shows how different subpaths are mapped to JavaScript files and TypeScript declaration files, including version-specific type mappings for TypeScript versions.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/nodeModulesExportsBlocksTypesVersions(module=nodenext).errors.txt#_snippet_0

LANGUAGE: json
CODE:

```
{
      "name": "exports-and-types-versions",
      "version": "1.0.0",
      "exports": {
        "./foo": "./dist/foo.js",
        "./yep": {
          "types": "./types/foo.d.ts",
          "default": "./dist/foo.js"
        },
        "./versioned-yep": {
          "types@>=4": "./types/foo.d.ts"
        },
        "./versioned-nah": {
          "types@<4": "./types/foo.d.ts"
        }
      },
      "typesVersions": {
        "*": {
          "foo": ["./types/foo.d.ts"],
          "nope": ["./types/foo.d.ts"],
          "versioned-nah": ["./types/foo.d.ts"]
        }
      }
    }
```

---

TITLE: TypeScript Error TS2834/TS2835: Relative ECMAScript Imports Require Extensions
DESCRIPTION: This snippet illustrates TypeScript errors TS2834 and TS2835, which occur when relative ECMAScript 'import' statements lack explicit file extensions (e.g., .js, .mjs) under 'node16' or 'nodenext' module resolution. TypeScript suggests adding an extension or provides a specific '.mjs' suggestion.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/nodeModules1(module=node20).errors.txt#_snippet_2

LANGUAGE: TypeScript
CODE:

```
!!! error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.
    import * as m23 from "./subfolder2/another/index";
                         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
!!! error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './subfolder2/another/index.mjs'?
    void m1;
    void m2;
    void m3;
    void m4;
    void m5;
    void m6;
    void m7;
    void m8;
    void m9;
    void m10;
    void m11;
    void m12;
    void m13;
    void m14;
    void m15;
    void m16;
    void m17;
    void m18;
    void m19;
    void m20;
    void m21;
    void m22;
    void m23;
```

---

TITLE: Filtering Mapped Type Keys with Conditional Type in TypeScript
DESCRIPTION: This snippet defines `Mapped5` which conditionally remaps keys, only including those that start with an underscore. The function `f5` demonstrates accessing properties of `Mapped5`, where the type system correctly infers that the accessed values will conform to `_${string}`.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/mappedTypeConstraints2.errors.txt#_snippet_4

LANGUAGE: TypeScript
CODE:

```
type Mapped5<K extends string> = {
  [P in K as P extends `_${string}` ? P : never]: P;
};

function f5<K extends string>(obj: Mapped5<K>, key: keyof Mapped5<K>) {
  let s: `_${string}` = obj[key];
}
```

---

TITLE: TypeScript Switch Statement for Valid Response Handling
DESCRIPTION: Illustrates a switch statement handling known string literal responses ('yes', 'no', 'idk') from an 'unknown' input. It returns a 'SomeResponse' type for valid cases or throws an error for unknown values, ensuring type safety.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/unknownType2.errors.txt#_snippet_8

LANGUAGE: TypeScript
CODE:

```
    function switchResponse(x: unknown): SomeResponse {
        switch (x) {
            case 'yes':
            case 'no':
            case 'idk':
                return x;
            default:
                throw new Error('unknown response');
        }
        // Arguably this should be never.
        type End = isTrue<isUnknown<typeof x>>
    }
```

---

TITLE: Discriminated Union Narrowing with Boolean Property Type Predicate in TypeScript (Issue 58996)
DESCRIPTION: This snippet, related to TypeScript issue #58996, showcases type narrowing using a boolean property as a discriminator in a union type. The 'isAnimal' function acts as a type predicate, narrowing 'Something' to 'Animal' based on the 'breath' property. The 'positive' and 'negative' functions demonstrate how this predicate can be used directly or negated for conditional type narrowing.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/inferTypePredicates.errors.txt#_snippet_37

LANGUAGE: TypeScript
CODE:

```
type Animal = {
  breath: true,
};

type Rock = {
  breath: false,
};

type Something = Animal | Rock;

function isAnimal(something: Something): something is Animal {
  return something.breath
}

function positive(t: Something) {
  return isAnimal(t)
}

function negative(t: Something) {
  return !isAnimal(t)
}
```

---

TITLE: Importing Modules with Missing Type Declarations in TypeScript
DESCRIPTION: This TypeScript snippet attempts to import default exports from various local files with different extensions. Each import statement results in a `TS2307` error, indicating that the module or its corresponding type declarations cannot be found, highlighting TypeScript's strict module resolution when type definitions are absent.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/declarationFileForTsJsImport(module=nodenext).errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
import def1 from "./file.js";
import def2 from "./file.jsx";
import def3 from "./file.ts";
import def4 from "./file.tsx";
import def5 from "./file.mjs";
import def6 from "./file.cjs";
import def7 from "./file.mts";
import def8 from "./file.cts";
import def9 from "./file.d.ts";
import def10 from "./file.d.cts";
import def11 from "./file.d.mts";
import def12 from "./file.d.json.ts";
```

---

TITLE: Defining a Class in TypeScript (a.js)
DESCRIPTION: This snippet defines a simple TypeScript class 'A'. This class serves as the original source for both type and value exports, which are then re-exported and consumed by other modules in the example.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/exportNamespace_js.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
export class A {}
```

---

TITLE: Public Arrow Function with Implicit Any and Any[] Rest Parameters (TypeScript)
DESCRIPTION: This snippet defines a public arrow function `pub_f14` with a regular parameter `x` and a rest parameter `r`. Both are implicitly typed, leading to a `TS7006` error for `x` and a `TS7019` error for `r` when `noImplicitAny` is active, emphasizing the need for explicit type declarations.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/noImplicitAnyParametersInClass.errors.txt#_snippet_13

LANGUAGE: TypeScript
CODE:

```
public pub_f14 = (x, ...r) => "";
```

---

TITLE: Defining and Exporting a TypeScript Interface
DESCRIPTION: This TypeScript snippet defines a simple interface named `Foo` with a single numeric property `x`. It then exports this interface as the default export, making it available for import and use in other TypeScript modules.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/declarationEmitToDeclarationDirWithoutCompositeAndDeclarationOptions.errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
interface Foo {
    x: number;
}
export default Foo;
```

---

TITLE: Incorrect Value Usage of Type-Only Imports (TS1361)
DESCRIPTION: This snippet highlights common TypeScript errors (TS1361) that occur when attempting to use entities imported with `import type` in value positions, specifically when extending a class. Since `C` was imported as a type and `types` as a type-only namespace, neither can be used as a base class for `U` or `V` respectively, resulting in compilation errors.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/extendsClause.errors.txt#_snippet_3

LANGUAGE: TypeScript
CODE:

```
class U extends C {} // Error
class V extends types.C {} // Error
```

---

TITLE: Continuous Paging with Async While Loop in TypeScript
DESCRIPTION: This snippet demonstrates an `async` function `myFunc` that continuously fetches data using `myQuery` in an infinite `while` loop. It implements a common paging pattern by passing the `lastId` from the previous query's results to the next, handling `undefined` for the initial call.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/controlFlowIterationErrorsAsync.errors.txt#_snippet_13

LANGUAGE: TypeScript
CODE:

```
declare function myQuery(input: { lastId: number | undefined }): Promise<{ entities: number[] }>;

async function myFunc(): Promise<void> {
  let lastId: number | undefined = undefined;

  while (true) {
    const { entities } = await myQuery({
        lastId,
    });

    lastId = entities[entities.length - 1];
  }
}
```

---

TITLE: Implementing Reducer with Discriminated Union Arguments
DESCRIPTION: Defines a `reducer` function that accepts arguments based on a discriminated union type `ReducerArgs`. The `switch` statement on the `op` parameter correctly narrows the type of `args`, enabling type-safe access to properties like `a`, `b`, `firstArr`, and `secondArr`.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/dependentDestructuredVariables.errors.txt#_snippet_24

LANGUAGE: TypeScript
CODE:

```
type ReducerArgs = ["add", { a: number, b: number }] | ["concat", { firstArr: any[], secondArr: any[] }];

const reducer: (...args: ReducerArgs) => void = (op, args) => {
    switch (op) {
        case "add":
            console.log(args.a + args.b);
            break;
        case "concat":
            console.log(args.firstArr.concat(args.secondArr));
            break;
    }
}

reducer("add", { a: 1, b: 3 });
reducer("concat", { firstArr: [1, 2], secondArr: [3, 4] });
```

---

TITLE: Destructuring Array Elements in TypeScript
DESCRIPTION: This snippet demonstrates array destructuring assignment in TypeScript. It extracts the first element from the `multiRobotA` array and assigns it to the `multiRobotAInfo` variable. This is a concise way to unpack values from arrays into distinct variables.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/sourceMapValidationDestructuringVariableStatementArrayBindingPattern2.sourcemap.txt#_snippet_8

LANGUAGE: TypeScript
CODE:

```
let [multiRobotAInfo] = multiRobotA;
```

---

TITLE: Defining Type Package Exports (JSON)
DESCRIPTION: This `package.json` defines the exports for the `@types/foo` package. It specifies conditional exports for `import` (pointing to `index.d.mts`) and `require` (pointing to `index.d.cts`), allowing different declaration files to be used based on the module resolution context.
SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/resolutionModeTripleSlash5.errors.txt#_snippet_2

LANGUAGE: JSON
CODE:

```
{
  "name": "@types/foo",
  "version": "1.0.0",
  "exports": {
    ".": {
      "import": "./index.d.mts",
      "require": "./index.d.cts"
    }
  }
}
```
