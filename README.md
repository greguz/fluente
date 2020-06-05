# fluente

[![npm version](https://badge.fury.io/js/fluente.svg)](https://badge.fury.io/js/fluente)
[![Dependencies Status](https://david-dm.org/greguz/fluente.svg)](https://david-dm.org/greguz/fluente.svg)
[![Build Status](https://travis-ci.com/greguz/fluente.svg?branch=master)](https://travis-ci.com/greguz/fluente)
[![Coverage Status](https://coveralls.io/repos/github/greguz/fluente/badge.svg?branch=master)](https://coveralls.io/github/greguz/fluente?branch=master)

Make fluent API like a boss!

## Core features

- **Protected state**
- **Undo/Redo out of the box**
- **State locking**: by default enforces single state access.
- **State sharing**: optionally emulates traditional `class` behavior.
- **TypeScript support**

## Installation

```
npm install --save fluente
```

## Example

```javascript
const fluente = require('fluente')

function unwrap (state) {
  return state.value
}

function add (state, value) {
  return {
    value: unwrap(state) + value
  }
}

function subtract (state, value) {
  return {
    value: unwrap(state) - value
  }
}

function multiply (state, value) {
  return {
    value: unwrap(state) * value
  }
}

function divide (state, value) {
  return {
    value: unwrap(state) / value
  }
}

function createCalculator (initialValue = 0) {
  return fluente({
    // Initial state
    state: {
      value: initialValue
    },
    // Fluent mappers (update state)
    fluent: {
      add,
      subtract,
      multiply,
      divide
    },
    // Normal mappers (transform state)
    methods: {
      unwrap
    },
    // Constant properties
    constants: {
      [Symbol.for('calculator')]: true
    }
  })
}

const calculator = createCalculator()

if (calculator[Symbol.for('calculator')] !== true) {
  throw new Error('Expected calculator')
}

const result = calculator
  .add(2)
  .subtract(4)
  .multiply(-1)
  .divide(2)
  .undo(2) // Undo 2 mutations: divide(2) and multiply(-1)
  .redo(1) // Redo 1 mutation: multiply(-1)
  .unwrap()

console.log(result) // Logs '2'
```

## fluente(options)

The whole library consists of just one function. Everything is optional.

- `options` `<Object>`
  - `state` `<Object>` Initial state.
  - `fluent` `<Object>` Fluent state mappers.
  - `methods` `<Object>` Normal state mappers.
  - `constants` `<Object>`
  - `produce` `<Function>` See [state manipulation](#state-manipulation).
  - `historySize` `<Number>` See [undo and redo](#undo-and-redo).
  - `skipLocking` `<Boolean>` See [locking](#locking).
  - `sharedState` `<Boolean>` See [state sharing](#state-sharing).
- Returns: `<Object>`

## State mappers

A fluent method is a function that updates its state and then returns its context. Classes use "`return this`" approach, Closures use recursion to achieve this result. In any case, there's some glue-code to write to make it happen.

Any function (or method) essentially is just a state mapper: a function that takes some arguments and then maps its current state into something useful. Fluent functions perform some state updates. Normal functions map the state into something new.

```javascript
class Calculator {
  constructor (initialValue = 0) {
    // Init state
    this._value = initialValue
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
    // Map state to number
    return this._value
  }
}

const calculator = new Calculator(40)

const result = calculator
  .add(2)
  .unwrap()

console.log(result) // Logs '42'
```

Fluente takes state mappers as input and returns the built object. The state is hidden, preventing external access. And a nice [undo-redo](#undo-and-redo) feature is added.

```javascript
const fluente = require('fluente')

function unwrap (state) {
  return state.value
}

function add (state, value) {
  return {
    value: unwrap(state) + value
  }
}

function createCalculator (initialValue = 0) {
  return fluente({
    // Initial state
    state: {
      value: initialValue
    },
    // Fluent mappers (update state)
    fluent: {
      add
    },
    // Normal mappers (transform state)
    methods: {
      unwrap
    }
  })
}

const result = createCalculator(40)
  .add(2)
  .add(NaN)
  .undo(2) // Undo 2 mutations: add(NaN) and add(2)
  .redo(1) // Redo 1 mutation: add(2)
  .unwrap()

console.log(result) // Logs '42'
```

## State manipulation

By default, all fluent functions need to return an updated state, even partially, to let Fluente know **what** is changed. Plus state needs to be treated as **immutable**. Those rules are necessary to ensure correct state isolation. The `subtract` function in the next example is updating the state's `value` property by returning an object containing that property.

```javascript
function subtract (state, value) {
  return {
    value: state.value - value
  }
}
```

However, other state manipulation systems are viable through a custom Producer. A Producer is a function that accepts both state object and map function. Its purpose is to handle any map mutations applied against the state and then return a new and fully updated state.

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
    // Define custom producer
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
```

The easiest and safest way to support direct state manipulation is to use [Immer](https://www.npmjs.com/package/immer)'s `produce` function.

```javascript
const fluente = require('fluente')
const immer = require('immer')

function createCalculator (initialValue = 0) {
  return fluente({
    // Use Immer to handle state changes
    produce: immer.produce,
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
    },
  })
}
```

[Immutable.js](https://www.npmjs.com/package/immutable) is also supported.

```javascript
const fluente = require('fluente')
const { Map } = require('immutable')

function unwrap (state) {
  return state.get('value')
}

function add (state, value) {
  return state.set('value', unwrap(state) + value)
}

function createCalculator (initialValue = 0) {
  return fluente({
    // Direct mapping (fluent mappers need to return the updated state)
    produce: (state, mapper) => mapper(state),
    // Initial state (init with Immutable.js)
    state: Map({
      value: initialValue
    }),
    fluent: {
      add
    },
    methods: {
      unwrap
    }
  })
}
```

There's an `examples` directory inside this repo.

## Undo and Redo

An isolated state enables easy undo-redo implementation. The current state represents the present moment. Applying a mutation move the present into the past, and set a new present state. Undoing a mutation will restore a state from the past, and move the present state into the future. Redoing a mutation will do the opposite. A more detailed example is available in [this](https://redux.js.org/recipes/implementing-undo-history) Redux article.

Fluente automatically injects undo-redo functions. Both functions optionally accept the number of mutations to apply, defaulting to `1` mutation. `Infinity` is accepted, and means "redo/undo all the mutations available".

The `historySize` option controls the max number of mutations remembered by Fluente. It's set to `10` by default, to limit memory usage.

## Locking

Any time a state is accessed, Fluente locks the object that acted. This way ensures that only the last version of the state is usable. Plus, inside the state may be present something not usable twice.

```javascript
const cZero = createCalculator(0) // cZero is unlocked
const cOne = cZero.add(1) // Now cZero is locked, and cOne is unlocked
const result = cOne.unwrap() // Now both cZero and cOne are locked
try {
  cOne.add(1) // Will throw
} catch (err) {
  console.log(err.message) // Logs 'Locked'
  console.log(err.code) // Logs 'FLUENTE_LOCKED'
}
```

Setting the `skipLocking` option to `true` disables this check, permitting multiple usages of the same object at any time.

```javascript
function createUnlockedCalculator (initialValue = 0) {
  return fluente({
    // Disable locking
    skipLocking: true,
    state: {
      value: initialValue
    },
    fluent: {
      add,
      subtract,
      multiply,
      divide
    },
    methods: {
      unwrap
    }
  })
}

const cZero = createUnlockedCalculator(0)
const cOne = cZero.add(1)
const cTwo = cZero.add(2)
console.log(
  cZero.unwrap(),
  cOne.unwrap(),
  cTwo.unwrap()
)
```

## State sharing

Share the state means that all objects are always working with the last version of the state, emulating traditional class behavior.

```javascript
function createClassyCalculator (initialValue = 0) {
  return fluente({
    // Enable state sharing
    sharedState: true,
    state: {
      value: initialValue
    },
    fluent: {
      add,
      subtract,
      multiply,
      divide
    },
    methods: {
      unwrap
    }
  })
}

const myFirstCalculator = createClassyCalculator(0)
const mySecondCalculator = myFirstCalculator.add(1)
mySecondCalculator.add(1)
console.log(myFirstCalculator.unwrap()) // Logs '2'
```
