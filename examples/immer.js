const fluente = require('/fluente')
const immer = require('immer')

function createCalculator (initialValue = 0) {
  return fluente({
    // Use Immer to handle state changes
    produce: immer.produce,
    // Initial state
    state: {
      value: initialValue
    },
    // Fluent mappers (update state)
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
    // Normal mappers (transform state)
    methods: {
      unwrap (state) {
        return state.value
      }
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
