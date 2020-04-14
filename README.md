# fluente

Make fluent API like a boss!

## Installation

```
npm install --save fluente
```

## Example

```javascript
const fluente = require('fluente')
const immer = require('immer')

const calculator = fluente({
  // Use immer to handle state changes
  produce: immer.produce,
  // Define initial state
  state: {
    value: 0
  },
  // Define fluent mappers
  fluent: {
    add (state, value) {
      state.value += value
    },
    subtract (state, value) {
      state.value -= value
    },
    multiply (state, value) {
      state.value *= value
    },
    divide (state, value) {
      state.value /= value
    }
  },
  // Define normal mappers
  methods: {
    // Expose current value (otherwise hidden)
    unwrap (state) {
      return state.value
    }
  },
  // Define constant properties
  constants: {
    [Symbol.for('calculator')]: true
  }
})

if (calculator[Symbol.for('calculator')] === true) {
  const result = calculator
    .add(2)
    .subtract(4)
    .multiply(-1)
    .divide(2)
    .undo(2)
    .redo() // Defaults to 1
    .unwrap()

  // Logs '2'
  console.log(result)
}
```

## Core features

- **Less code:** provides a concise way to define fluent objects.
- **Protected state:** there's no way to access it externally.
- **Undo/Redo out of the box**
- **Branching support:** enables old objects reuse.
- **TypeScript support**

## fluente([options])

The whole library consists of just one function. Everything is optional.

- `options` `<Object>`
  - `state` `<Object>` Initial state.
  - `fluent` `<Object>` Fluent state mappers.
  - `methods` `<Object>` Normal state mappers.
  - `constants` `<Object>`
  - `historySize` `<Number>` Defaults to `10`.
  - `produce` `<Function>` See [direct state manipulation](#direct-state-manipulation).
  - `branch` `<Boolean>` See [branching](#branching).
- Returns: `<Object>`

## State mappers

A fluent method is a function that updates its state and then returns its context. Classes use "`return this`" approach, Closures use recursion to achieve this result. In any case, there's some glue-code to write to make it happen.

Any function (or method) essentially is just a state mapper: a function that takes some arguments and then maps its current state into something useful. Fluent functions perform some state updates. Normal functions map the state into something new.

```javascript
class Calculator {
  constructor (value = 0) {
    // Init state
    this._value = value
  }

  /**
   * Fluent method
   */
  add (value) {
    // Update state
    this._value += value
    // Return context
    return this
  }

  /**
   * Normal method
   */
  unwrap () {
    // Get one state's property
    return this._value
  }
}

const calculator = new Calculator()

const value = calculator
  .add(1)
  .unwrap()

console.log(value) // 1
```

Fluente takes state mappers as input and returns the built object, limiting repetitive code. The state is hidden, preventing external access. And a nice undo-redo feature is added.

```javascript
const fluente = require('fluente')

function createCalculator (initialValue = 0) {
  return fluente({
    // Init state
    state: {
      value: initialValue
    },
    // Define fluent functions
    fluent: {
      add (state, value) {
        return {
          value: state.value + value
        }
      }
    },
    // Define normal functions
    methods: {
      unwrap (state) {
        return state.value
      }
    }
  })
}

const value = createCalculator()
  .add(1)
  .add(NaN)
  .undo(2)
  .redo(1)
  .unwrap()

console.log(value) // 1
```

## Direct state manipulation

By default, all fluent functions need to return an updated state, even partially, to let Fluente know _what_ is changed. Plus state needs to be treated as **immutable**. Those rules are necessary to ensure the correct state undo and redo.

```javascript
function subtract (state, value) {
  return {
    value: state.value - value
  }
}
```

However, direct state manipulation is viable through a custom Producer. A Producer is a function that accepts both state object and map function. Its purpose is to handle any map mutations applied against the state and then return a new and fully updated state.

```javascript
const fluente = require('fluente')

function mySimpleProducer (oldState, mapper) {
  // Clone current state
  const newState = Object.assign({}, oldState)
  // Run state mapper (may override some root properties now)
  mapper(newState)
  // Return updated state
  return newState
}

function createCalculator (initialValue = 0) {
  return fluente({
    produce: mySimpleProducer,
    state: {
      value: initialValue
    },
    fluent: {
      add (state, value) {
        // Direct state manipulation
        state.value += value
      }
    },
    methods: {
      unwrap (state) {
        return state.value
      }
    }
  })
}

const value = createCalculator()
  .add(1)
  .add(NaN)
  .undo(2)
  .redo(1)
  .unwrap()

console.log(value) // 1
```

The easiest and safest way to support direct state manipulation is to use Immer's `produce` function, as shown in the [example](#example).

## Branching

A fluent method call generates a new object and invalidates the previous one, ensuring only the last version is usable. Enabling branching will cause old objects to be still valid.

```javascript
const fluente = require('fluente')

function createCalculator (initialValue = 0) {
  return fluente({
    // Enable branching
    branch: true,
    state: {
      value: initialValue
    },
    fluent: {
      add (state, value) {
        return {
          value: state.value + value
        }
      }
    },
    methods: {
      unwrap (state) {
        return state.value
      }
    }
  })
}

const cZero = createCalculator()
const cOne = cZero.add(1)
const cUniverse = cZero.add(42)
console.log(
  cZero.unwrap(),
  cOne.unwrap(),
  cUniverse.unwrap()
)
```