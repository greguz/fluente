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
  // Define state mappers
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
  - `methods` `<Object>` Simple state mappers.
  - `constants` `<Object>`
  - `historySize` `<Number>` Defaults to `10`.
  - `produce` `<Function>` See [producer](#producer).
  - `branch` `<Boolean>` See [branching](#branching).
- Returns: `<Object>`

## State mappers

A fluent method is a function that updates its state and then returns its context. Classes use "`return this`" approach, Closures use recursion. In any case, there's some glue-code to write to make it happen.

Removing all repetitive code, a fluent method is just a state mapper: a function that takes some arguments and then maps the state into a new one.

Fluente accepts state mappers as input and returns the built object, hiding all the noisy details of a correct fluent implementation.

```javascript
const fluente = require('fluente')

// Simple state mapper (maps state into something)
function toDate (state) {
  return new Date(state.date.getTime())
}

// Fluent state mapper (returns updated state)
function minutes (state, n) {
  const date = toDate(state)
  date.setMinutes(n)
  return { date }
}

// A partially working moment clone
function moment (value) {
  return fluente({
    // Define initial state
    state: {
      date: new Date(value)
    },
    // Define fluent methods
    fluent: {
      minutes
    },
    // Define other methods
    methods: {
      toDate
    }
  })
}

const iso = moment(1586697974621)
  .minutes(11)
  .toDate()
  .toISOString()

// 2020-04-12T13:11:14.621Z
console.log(iso)
```

## Producer

A Producer is a function that accepts both state object and map function. Its purpose is to handle any map mutations applied against the state and then return a new and fully updated state.

By default, all fluent mappers need to return an updated state, even partially, to let Fluente know what is changed. Plus state needs to be treated as immutable.

```javascript
function defaultProducer (state, mapper) {
  return Object.assign(
    {},
    state,
    mapper(state)
  )
}
```

The easiest way to support direct state manipulation is to use Immer's `produce` function, as shown in the [example](#example).

## Branching

A fluent method call generates a new object and invalidates the previous one, ensuring only the last version is usable. Enabling branching will cause old objects to be still valid.
