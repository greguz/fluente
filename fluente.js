'use strict'

const Herry = require('herry')

const stateSymbol = Symbol('fluente')

function getState (obj) {
  if (typeof obj === 'object' && obj !== null && obj.hasOwnProperty(stateSymbol)) {
    return obj[stateSymbol]
  } else {
    throw new Herry('FLUENTE_UNBOUND', 'Unbound call')
  }
}

function set (obj, path, value) {
  obj[path] = value
  return obj
}

function mapValues (obj, iteratee) {
  return Object.getOwnPropertySymbols(obj).concat(Object.keys(obj)).reduce(
    (acc, key) => set(acc, key, iteratee(obj[key], key)),
    {}
  )
}

function takeRight (array, n) {
  return array.length > n
    ? array.slice(array.length - n)
    : array
}

function parseNumber (value, defaultValue) {
  return value === undefined
    ? defaultValue
    : typeof value !== 'number' || isNaN(value) || value < 0
    ? 0
    : value
}

function defaultProducer (state, mapper) {
  return Object.assign({}, state, mapper(state))
}

function readContext (state) {
  return state.present
}

function assignState (state, partial) {
  return Object.assign({}, state, partial)
}

function updateState (state, present) {
  return assignState(state, {
    past: takeRight([...state.past, state.present], state.historySize),
    present,
    future: []
  })
}

function moveState (state, steps, forward) {
  const past = state.past.slice()
  let present = readContext(state)
  const future = state.future.slice()

  const source = forward ? future : past
  const target = forward ? past : future
  for (let i = 0; i < steps && source.length > 0; i++) {
    target.push(present)
    present = source.pop()
  }

  return assignState(state, {
    past,
    present,
    future
  })
}

function bindDescriptors (descriptors, obj) {
  return mapValues(descriptors, descriptor => ({
    ...descriptor,
    value: typeof descriptor.value === 'function'
      ? descriptor.value.bind(obj)
      : descriptor.value
  }))
}

function createObject (state) {
  const obj = {}
  Object.defineProperty(obj, stateSymbol, {
    value: state,
    writable: state.isMutable === true
  })
  Object.defineProperties(
    obj,
    state.hardBinding === true
      ? bindDescriptors(state.descriptors, obj)
      : state.descriptors
  )
  return obj
}

function updateObject (obj, state) {
  if (state.isMutable === true) {
    obj[stateSymbol] = state
    return obj
  } else {
    return createObject(state)
  }
}

function fluentify (fn, key) {
  return Object.defineProperty(
    function (...args) {
      const state = getState(this)
      const out = state.produce(
        readContext(state),
        context => fn.call(null, context, ...args)
      )
      return updateObject(this, updateState(state, out))
    },
    'name',
    { value: key }
  )
}

function methodify (fn, key) {
  return Object.defineProperty(
    function (...args) {
      return fn.call(null, readContext(getState(this)), ...args)
    },
    'name',
    { value: key }
  )
}

function undo (steps) {
  return updateObject(
    this,
    moveState(getState(this), parseNumber(steps, 1), false)
  )
}

function redo (steps) {
  return updateObject(
    this,
    moveState(getState(this), parseNumber(steps, 1), true)
  )
}

function createDescriptors (constants, normalMethods, fluentMethods) {
  return Object.assign(
    {
      undo: {
        configurable: true,
        value: undo,
        writable: true
      },
      redo: {
        configurable: true,
        value: redo,
        writable: true
      }
    },
    mapValues(constants, value => ({
      configurable: true,
      enumerable: true,
      value,
      writable: true
    })),
    mapValues(normalMethods, (fn, key) => ({
      configurable: true,
      value: methodify(fn, key),
      writable: true
    })),
    mapValues(fluentMethods, (fn, key) => ({
      configurable: true,
      value: fluentify(fn, key),
      writable: true
    }))
  )
}

module.exports = function fluente (options) {
  return createObject({
    historySize: parseNumber(options.historySize, 10),
    isMutable: options.isMutable === true,
    hardBinding: options.hardBinding === true,
    past: [],
    present: options.state || {},
    future: [],
    produce: options.produce || defaultProducer,
    descriptors: createDescriptors(
      options.constants || {},
      options.methods || {},
      options.fluent || {}
    )
  })
}
