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

// Logs '2'
console.log(result)