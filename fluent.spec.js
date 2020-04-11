const test = require('ava')

const fluente = require('./fluente.js')

test('basic', t => {
  t.plan(9)

  const instance = fluente({
    state: {
      value: 0
    },
    fluent: {
      add (value) {
        t.pass()
        return {
          value: this.value + value
        }
      },
      sub (value) {
        t.pass()
        return {
          value: this.value - value
        }
      },
      div (value) {
        t.pass()
        return {
          value: this.value / value
        }
      },
      mul (value) {
        t.pass()
        return {
          value: this.value * value
        }
      }
    },
    methods: {
      unwrap () {
        return this.value
      }
    },
    constants: {
      hello: 'world'
    }
  })

  t.true(typeof instance.undo === 'function')
  t.true(typeof instance.redo === 'function')
  t.is(instance.hello, 'world')

  const result = instance
    .add(2)
    .sub(4)
    .mul(-1)
    .div(2)
    .unwrap()

  t.is(result, 1)

  t.throws(() => instance.unwrap())
})
