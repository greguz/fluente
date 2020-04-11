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
  produce: immer.produce,
  historySize: 100,
  state: {
    value: 0
  },
  fluent: {
    add (value) {
      this.value += value
    },
    sub (value) {
      this.value -= value
    },
    mul (value) {
      this.value *= value
    },
    div (value) {
      this.value /= value
    }
  },
  methods: {
    unwrap () {
      return this.value
    }
  },
  constants: {
    [Symbol.for('calculator')]: true
  }
})

if (calculator[Symbol.for('calculator')] === true) {
  const result = calculator
    .add(2)
    .sub(4)
    .mul(-1)
    .div(2)
    .unwrap()

  console.log(result)
}

// Will log '1'
```
