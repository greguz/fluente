const fluente = require('fluente')
const { Map } = require('immutable')

function unwrap (state) {
  return state.get('value')
}

function add (state, value) {
  return state.set('value', unwrap(state) + value)
}

function subtract (state, value) {
  return state.set('value', unwrap(state) - value)
}

function multiply (state, value) {
  return state.set('value', unwrap(state) * value)
}

function divide (state, value) {
  return state.set('value', unwrap(state) / value)
}

function createCalculator (initialValue = 0) {
  return fluente({
    // Direct mapping (fluent mappers need to return the updated state)
    produce: (state, mapper) => mapper(state),
    // Initial state (init with Immutable.js)
    state: Map({
      value: initialValue
    }),
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
