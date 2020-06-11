const test = require('ava')
const immer = require('immer')
const immutable = require('immutable')

const fluente = require('./fluente.js')

function noop () {
  // Nothing
}

test('interface', t => {
  const instance = fluente({
    fluent: {
      a: noop
    },
    methods: {
      b: noop
    },
    constants: {
      c: 42
    }
  })

  t.true(typeof instance.undo === 'function')
  t.true(typeof instance.redo === 'function')
  t.true(typeof instance.a === 'function')
  t.true(typeof instance.b === 'function')
  t.is(instance.c, 42)
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

test('locking', t => {
  const instance = fluente({
    fluent: {
      a: noop
    },
    methods: {
      b: noop
    }
  })
  instance.b()
  t.throws(() => instance.a(), { code: 'FLUENTE_LOCKED' })
  t.throws(() => instance.b(), { code: 'FLUENTE_LOCKED' })
  t.throws(() => instance.undo(), { code: 'FLUENTE_LOCKED' })
  t.throws(() => instance.redo(), { code: 'FLUENTE_LOCKED' })
})

test('immer', t => {
  t.plan(6)

  const instance = fluente({
    skipLocking: true,
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
    skipLocking: true,
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

test('stuck', t => {
  const instance = fluente({
    fluent: {
      a () {
        throw new Error('a-err')
      }
    },
    methods: {
      b () {
        throw new Error('b-err')
      }
    }
  })

  t.throws(() => instance.a(), { message: 'a-err' })
  t.throws(() => instance.b(), { message: 'b-err' })

  t.throws(() => instance.a(), { message: 'a-err' })
  t.throws(() => instance.b(), { message: 'b-err' })
})

test('binding', t => {
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
  a = a.next.call(null)
  t.is(a.unwrap.call(null), 1)

  let b = fluente({
    hardBinding: true,
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
  b = b.next.call(null)
  t.is(b.unwrap.call(null), 2)

  const c = fluente({
    hardBinding: false,
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
  t.throws(
    () => c.next.call(null),
    { code: 'FLUENTE_UNBOUND' }
  )
  t.throws(
    () => c.unwrap.call(null),
    { code: 'FLUENTE_UNBOUND' }
  )
})
