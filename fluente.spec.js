'use strict'

const test = require('ava')
const immer = require('immer')
const immutable = require('immutable')

const fluente = require('./fluente.js')

function noop () {
  // Nothing
}

test('defaults', t => {
  fluente({})
  t.pass()
})

test('interface', t => {
  const symbol = Symbol('test')

  const instance = fluente({
    state: {
      value: 1
    },
    constants: {
      constant: 2,
      [symbol]: 3
    },
    getters: {
      value: state => state.value
    },
    fluents: {
      fMethod: noop
    },
    mappers: {
      mMethod: noop
    }
  })

  t.is(instance.constant, 2)
  t.is(instance[symbol], 3)
  t.is(instance.value, 1)
  t.true(typeof instance.fMethod === 'function')
  t.is(instance.fMethod.name, 'fMethod')
  t.true(typeof instance.mMethod === 'function')
  t.is(instance.mMethod.name, 'mMethod')
  t.true(typeof instance.undo === 'function')
  t.is(instance.undo.name, 'undo')
  t.true(typeof instance.redo === 'function')
  t.is(instance.redo.name, 'redo')
})

test('lifecycle', t => {
  t.plan(6)

  const instance = fluente({
    state: {
      value: 0
    },
    fluents: {
      add (state, value) {
        t.pass()
        return {
          value: state.value + value
        }
      }
    },
    mappers: {
      unwrap (state) {
        return state.value
      }
    }
  })

  const result = instance
    .add(1)
    .add(1)
    .add(1)
    .add(1)
    .add(1)
    .unwrap()

  t.is(result, 5)
})

test('historySize', t => {
  const instance = fluente({
    historySize: 3,
    state: {
      value: 0
    },
    fluents: {
      add (state, value) {
        return {
          value: state.value + value
        }
      }
    },
    mappers: {
      unwrap (state) {
        return state.value
      }
    }
  })

  const five = instance
    .add(1)
    .add(1)
    .add(1)
    .add(1)
    .add(1)

  t.is(five.undo(Infinity).unwrap(), 2)
  t.is(five.undo(Infinity).redo(2).unwrap(), 4)
  t.is(five.undo().unwrap(), 4)
  t.is(five.undo(Infinity).redo(Infinity).unwrap(), 5)
  t.is(five.undo(3).redo(3).unwrap(), 5)
  t.throws(() => five.undo(4), { message: 'State history is empty' })
})

test('mutable', t => {
  const instance = fluente({
    mutable: true,
    state: {
      value: 0
    },
    fluents: {
      add (state, value) {
        return {
          value: state.value + value
        }
      }
    },
    mappers: {
      unwrap (state) {
        return state.value
      }
    }
  })

  t.true(instance === instance.add(1))
  t.true(instance === instance.add(1))
  t.true(instance === instance.add(1))
  t.true(instance === instance.add(1))
  t.true(instance === instance.add(1))

  t.is(instance.unwrap(), 5)
  t.throws(instance.unwrap)
})

test('errors', t => {
  const errInvalidNumber = { message: 'Expected zero, a positive integer, or Infinity' }
  const errNoHistory = { message: 'History is disabled' }

  t.throws(() => fluente({ historySize: null }), errInvalidNumber)
  t.throws(() => fluente({ historySize: -Infinity }), errInvalidNumber)
  t.throws(() => fluente({ historySize: -1 }), errInvalidNumber)
  t.throws(() => fluente({ historySize: 1.1 }), errInvalidNumber)

  const a = fluente({})
  t.throws(() => a.undo(), errNoHistory)
  t.throws(() => a.redo(), errNoHistory)

  const b = fluente({ historySize: 1 })
  t.throws(() => b.undo(null), errInvalidNumber)
  t.throws(() => b.undo(-Infinity), errInvalidNumber)
  t.throws(() => b.undo(-1), errInvalidNumber)
  t.throws(() => b.undo(1.1), errInvalidNumber)
  t.throws(() => b.redo(null), errInvalidNumber)
  t.throws(() => b.redo(-Infinity), errInvalidNumber)
  t.throws(() => b.redo(-1), errInvalidNumber)
  t.throws(() => b.redo(1.1), errInvalidNumber)
})

test('immer', t => {
  t.plan(6)

  const instance = fluente({
    produce: immer.produce,
    state: {
      value: 0
    },
    fluents: {
      add (state, value) {
        t.pass()
        state.value += value
      }
    },
    mappers: {
      unwrap (state) {
        t.pass()
        return state.value
      }
    }
  })

  t.is(instance.add(+1).unwrap(), +1)
  t.is(instance.add(-1).unwrap(), -1)
})

test('immutable', t => {
  t.plan(6)

  const instance = fluente({
    produce: (state, mapper) => mapper(state),
    state: immutable.Map({
      value: 0
    }),
    fluents: {
      add (state, value) {
        t.pass()
        return state.set(
          'value',
          state.get('value') + value
        )
      }
    },
    mappers: {
      unwrap (state) {
        t.pass()
        return state.get('value')
      }
    }
  })

  t.is(instance.add(+1).unwrap(), +1)
  t.is(instance.add(-1).unwrap(), -1)
})

test('getters', t => {
  t.plan(4)

  const instance = fluente({
    state: {
      a: 1,
      b: 2,
      c: 4
    },
    getters: {
      a: state => state.a,
      b: state => state.b,
      c: state => state.c
    }
  })

  t.is(instance.a, 1)
  t.is(instance.b, 2)
  t.is(instance.c, 4)

  t.throws(() => instance.a = 4)
})
