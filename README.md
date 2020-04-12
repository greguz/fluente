# fluente

Make fluent API like a boss!

## Installation

```
npm install --save fluente
```

## Usage

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
  // Define fluent methods
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
  // Define non-fluent methods
  methods: {
    // Expose the current value (otherwise hidden)
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
