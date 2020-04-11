const test = require('ava')

const fluente = require('./fluente.js')

function noop () {
  // nothing
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
      add (value) {
        t.pass()
        return {
          value: this.value + value
        }
      }
    },
    methods: {
      unwrap () {
        return this.value
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
  const instance = fluente()
  instance.undo()
  t.throws(instance.undo)
})
