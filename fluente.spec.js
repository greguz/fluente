const test = require('ava')
const immer = require('immer')
const immutable = require('immutable')

const fluente = require('./fluente.js')

function noop () {
  // Nothing
}

test('interface', t => {
  const sym = Symbol('test')

  const instance = fluente({
    fluent: {
      a: noop
    },
    methods: {
      b: noop
    },
    constants: {
      c: 42,
      [sym]: true
    }
  })

  t.true(typeof instance.undo === 'function')
  t.true(typeof instance.redo === 'function')
  t.true(typeof instance.a === 'function')
  t.true(typeof instance.b === 'function')
  t.is(instance.c, 42)
  t.true(instance[sym])
})

test('lifecycle', t => {
  t.plan(6)

  const instance = fluente({
    historySize: 3,
    state: {
      value: 0
    },
    fluent: {
      add (state, value) {
        t.pass()
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

  const result = instance
    .add(1)
    .add(1)
    .add(1)
    .add(1)
    .add(1)
    .undo(Infinity)
    .redo()
    .unwrap()

  t.is(result, 3)
})

test('immer', t => {
  t.plan(6)

  const instance = fluente({
    produce: immer.produce,
    state: {
      value: 0
    },
    fluent: {
      add (state, value) {
        t.pass()
        state.value += value
      }
    },
    methods: {
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
    fluent: {
      add (state, value) {
        t.pass()
        return state.set(
          'value',
          state.get('value') + value
        )
      }
    },
    methods: {
      unwrap (state) {
        t.pass()
        return state.get('value')
      }
    }
  })

  t.is(instance.add(+1).unwrap(), +1)
  t.is(instance.add(-1).unwrap(), -1)
})

test('steps validation', t => {
  const instance = fluente({
    historySize: 3,
    state: {
      value: 0
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

  const result = instance
    .add(1)
    .add(1)
    .add(1)
    .add(1)
    .add(1)
    .undo(null)
    .undo('1')
    .undo(NaN)
    .undo(-5)
    .undo(-Infinity)
    .unwrap()

  t.is(result, 5)
})

test('mutable', t => {
  const instance = fluente({
    isMutable: true,
    state: {
      value: 0
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

  t.true(instance === instance.add(1))
  t.true(instance === instance.add(1))
  t.true(instance === instance.add(1))
  t.true(instance === instance.add(1))
  t.true(instance === instance.add(1))
  t.true(instance === instance.undo(2))
  t.true(instance === instance.redo(1))

  t.is(instance.unwrap(), 4)
  t.throws(instance.unwrap)
})

test('defaults', t => {
  fluente({})
  t.pass()
})

test('binding', t => {
  const sym = Symbol('test')

  const constants = {
    test: true,
    [sym]: true
  }

  function next (state) {
    return {
      value: state.value + 1
    }
  }

  function unwrap (state) {
    return state.value
  }

  let a = fluente({
    // hardBinding: undefined,
    constants,
    state: {
      value: 0
    },
    fluent: {
      next
    },
    methods: {
      unwrap
    }
  })
  t.true(a.test)
  t.true(a[sym])
  t.throws(
    () => a.next.call(null),
    { message: 'Unbound call' }
  )
  t.throws(
    () => a.unwrap.call(null),
    { message: 'Unbound call' }
  )

  let b = fluente({
    hardBinding: true,
    constants,
    state: {
      value: 1
    },
    fluent: {
      next
    },
    methods: {
      unwrap
    }
  })
  t.true(b.test)
  t.true(b[sym])
  b = b.next.call(null)
  t.is(b.unwrap.call(null), 2)

  const c = fluente({
    hardBinding: false,
    constants,
    state: {
      value: 2
    },
    fluent: {
      next
    },
    methods: {
      unwrap
    }
  })
  t.true(c.test)
  t.true(c[sym])
  t.throws(
    () => c.next.call(null),
    { message: 'Unbound call' }
  )
  t.throws(
    () => c.unwrap.call(null),
    { message: 'Unbound call' }
  )
})
