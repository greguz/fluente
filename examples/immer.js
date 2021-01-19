const fluente = require('../fluente')
const { produce } = require('immer')

const symCalculator = Symbol('my_calculator')

function valueOf (state) {
  return state.value
}

function createCalculator (value = 0) {
  return fluente({
    // Enable state history (undo/redo)
    historySize: 8,
    // Use immer for direct state manipulation
    produce,
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
