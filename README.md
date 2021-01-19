# fluente

[![npm version](https://badge.fury.io/js/fluente.svg)](https://badge.fury.io/js/fluente)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Dependencies Status](https://david-dm.org/greguz/fluente.svg)](https://david-dm.org/greguz/fluente.svg)
[![Actions Status](https://github.com/greguz/fluente/workflows/ci/badge.svg)](https://github.com/greguz/fluente/actions)
[![Coverage Status](https://coveralls.io/repos/github/greguz/fluente/badge.svg?branch=master)](https://coveralls.io/github/greguz/fluente?branch=master)

Make fluent objects like a boss!

## Features

- **Zero dependencies**: small footprint.
- **Protected state**
- **Selective mutability**: choose between immutable objects or a classy object.
- **Undo/Redo out of the box**
- **TypeScript support**

## Installation

```
npm install --save fluente
```

## fluente(options)

Returns the build object.

- `options` `<Object>`
  - `state` `<Object>` Initial state.
  - `[constants]` `<Object>` Constant values.
  - `[getters]` `<Object>` Value getters.
  - `[fluents]` `<Object>` Fluent methods.
  - `[mappers]` `<Object>` Map (normal) methods.
  - `[mutable]` `<Boolean>` See [mutability](#mutability).
  - `[historySize]` `<Number>` See [undo and redo](#undo-and-redo).
  - `[produce]` `<Function>` See [state manipulation](#state-manipulation).
- Returns: `<Object>`

## Quickstart

The easiest way to create a _fluent_ API is by returning the instance itself inside a class method.

```javascript
class Calculator {
  constructor (value = 0) {
    this.value = value
  }

  add (value) {
    this.value += value
    return this // Fluent API
  }

  valueOf () {
    return this.value
  }
}

const calculator = new Calculator(0)

const value = calculator
  .add(2)
  .add(4)
  .add(8)
  .add(16)
  .valueOf()

console.log(value) // 30
```

Fluente provides a different way to declare _fluent_ objects.

```javascript
const fluente = require('fluente')

const symCalculator = Symbol('my_calculator')

function valueOf (state) {
  return state.value
}

function add (state, value) {
  return {
    value: valueOf(state) + value
  }
}

function subtract (state, value) {
  return {
    value: valueOf(state) - value
  }
}

function multiply (state, value) {
  return {
    value: valueOf(state) * value
  }
}

function divide (state, value) {
  return {
    value: valueOf(state) / value
  }
}

function createCalculator (value = 0) {
  return fluente({
    // Enable state history (undo/redo)
    historySize: 8,
    // Initial state
    state: {
      value
    },
    // Object constants
    constants: {
      [symCalculator]: true
    },
    // Value getters
    getters: {
      value: valueOf,
      integer: state => Number.isInteger(valueOf(state))
    },
    // Fluent methods
    fluents: {
      add,
      subtract,
      multiply,
      divide
    },
    // Map (normal) methods
    mappers: {
      valueOf
    }
  })
}

const zero = createCalculator(0)

// Read constant value
if (zero[symCalculator] !== true) {
  throw new Error('Expected calculator')
}

// Read value getters
console.log(zero.value, zero.integer) // 0 true

// Use fluent method
const pi = zero.add(Math.PI)

console.log(pi.value, pi.integer) // 3.141592653589793 false

const value = zero
  .add(2)
  .subtract(8)
  .multiply(-1)
  .divide(2)
  .undo(2) // Undo 2 mutations: divide(2) and multiply(-1)
  .redo(1) // Redo 1 mutation: multiply(-1)
  .valueOf() // Use map method

console.log(value) // 6
```

Like a `constructor`, Fluente returns an object. You can still declare methods, constants, and getters, but with a different signature. Functions do not use the `this` keyword to access the state. Instead, It's always passed as the first argument. Another key difference is how fluent methods mutate the state: by returning an object that contains the changed values.

These rules abstract the methods (and getters) definition and the state mutation, unlocking some cool features like selective mutability, state protection, and undo/redo.

## Mutability

By default, all objects build by Fluente are **immutable** (all _fluent_ methods will return a new object containing the updated state). You can retrieve mutable objects using the `mutable` option.

```javascript
const fluente = require('fluente')

function createCalculator (initialValue = 0) {
  return fluente({
    mutable: true, // Request mutable object
    state: {
      value: initialValue
    },
    fluents: {
      add (state, value) {
        return {
          value: state.value + value
        }
      }
    },
    mappers: {
      valueOf (state) {
        return state.value
      }
    }
  })
}

const calculator = createCalculator(0)
calculator.add(40)
calculator.add(2)
console.log(calculator.valueOf()) // 42
```

## Undo and Redo

An isolated state enables easy undo-redo implementation. The current state represents the present moment. Applying a mutation move the present into the past, and set a new present state. Undoing a mutation will restore a state from the past, and move the present state into the future. Redoing a mutation will do the opposite. A more detailed example is available in [this](https://redux.js.org/recipes/implementing-undo-history) Redux article.

Fluente automatically injects undo-redo functions. Both functions optionally accept the number of mutations to apply, defaulting to `1` mutation. `Infinity` is accepted, and means "redo/undo all the mutations available".

The `historySize` option controls the max number of mutations remembered by Fluente. Set the `historySize` option to a positive number to enable this feature.

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
    produce: mySimpleProducer, // Use a custom producer
    state: {
      value: initialValue
    },
    fluents: {
      add (state, value) {
        state.value += value // Direct state manipulation
      }
    },
    mappers: {
      valueOf (state) {
        return state.value
      }
    }
  })
}
```

The easiest and safest way to support direct state manipulation is to use [Immer](https://www.npmjs.com/package/immer)'s `produce` function.

```javascript
const fluente = require('fluente')
const { produce } = require('immer')

function createCalculator (initialValue = 0) {
  return fluente({
    produce, // Use Immer to handle state changes
    state: {
      value: initialValue
    },
    fluents: {
      add (state, value) {
        state.value += value // Direct state manipulation
      }
    },
    mappers: {
      valueOf (state) {
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

function valueOf (state) {
  return state.get('value')
}

function add (state, value) {
  return state.set('value', valueOf(state) + value)
}

function createCalculator (initialValue = 0) {
  return fluente({
    // Direct mapping (fluent mappers need to return the updated state)
    produce: (state, mapper) => mapper(state),
    // Initial state (init with Immutable.js)
    state: Map({
      value: initialValue
    }),
    fluents: {
      add
    },
    mappers: {
      valueOf
    }
  })
}
```
