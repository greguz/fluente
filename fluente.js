'use strict'

const symbol = Symbol('fluente')

function getState (obj) {
  if (typeof obj === 'object' && obj !== null && Object.prototype.hasOwnProperty.call(obj, symbol)) {
    return obj[symbol]
  } else {
    throw new Error('Unbound call')
  }
}

function mapValues (obj, mapper) {
  const out = {}
  for (const key of Reflect.ownKeys(obj)) {
    out[key] = mapper(obj[key], key)
  }
  return out
}

function takeRight (array, n) {
  return array.length > n
    ? array.slice(array.length - n)
    : array
}

function ensureValidNumber (value) {
  if (!(Number.isInteger(value) && value >= 0) && value !== Number.POSITIVE_INFINITY) {
    throw new Error('Expected zero, a positive integer, or Infinity')
  }
  return value
}

function defaultProducer (state, mapper) {
  return Object.assign({}, state, mapper(state))
}

function readContext (state) {
  return state.present
}

function updateState (state, present) {
  if (state.historySize < 1) {
    return { ...state, present }
  }

  return {
    ...state,
    past: takeRight([...state.past, state.present], state.historySize),
    present,
    future: []
  }
}

function moveState (state, steps, forward) {
  if (state.historySize < 1) {
    throw new Error('History is disabled')
  }

  const past = state.past.slice()
  let present = readContext(state)
  const future = state.future.slice()

  const source = forward ? future : past
  const target = forward ? past : future

  if (Number.isFinite(steps) && steps > source.length) {
    throw new Error('State history is empty')
  }

  for (let i = 0; i < steps && source.length > 0; i++) {
    target.push(present)
    present = source.pop()
  }

  return {
    ...state,
    past,
    present,
    future
  }
}

function createObject (state) {
  const obj = {}
  Object.defineProperty(obj, symbol, {
    value: state,
    writable: state.mutable === true
  })
  Object.defineProperties(obj, state.descriptors)
  return obj
}

function updateObject (obj, state) {
  if (state.mutable === true) {
    obj[symbol] = state
    return obj
  } else {
    return createObject(state)
  }
}

function wrapFluentMethod (fn, key) {
  return Object.defineProperty(
    function (...args) {
      const state = getState(this)
      const out = state.produce(
        readContext(state),
        context => fn(context, ...args)
      )
      return updateObject(this, updateState(state, out))
    },
    'name',
    { value: key }
  )
}

function wrapMapMethod (fn, key) {
  return Object.defineProperty(
    function (...args) {
      return fn(readContext(getState(this)), ...args)
    },
    'name',
    { value: key }
  )
}

function wrapGetter (fn) {
  return function getter () {
    return fn(readContext(getState(this)))
  }
}

function noSet () {
  throw new Error('This property does not have a setter')
}

function undo (steps = 1) {
  return updateObject(
    this,
    moveState(getState(this), ensureValidNumber(steps), false)
  )
}

function redo (steps = 1) {
  return updateObject(
    this,
    moveState(getState(this), ensureValidNumber(steps), true)
  )
}

function createDescriptors (constants, getters, fluents, mappers) {
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
    mapValues(getters, fn => ({
      configurable: true,
      enumerable: true,
      get: wrapGetter(fn),
      set: noSet
    })),
    mapValues(fluents, (fn, key) => ({
      configurable: true,
      value: wrapFluentMethod(fn, key),
      writable: true
    })),
    mapValues(mappers, (fn, key) => ({
      configurable: true,
      value: wrapMapMethod(fn, key),
      writable: true
    }))
  )
}

module.exports = function fluente ({
  constants = {},
  fluents = {},
  getters = {},
  historySize = 0,
  mappers = {},
  mutable = false,
  produce = defaultProducer,
  state
}) {
  return createObject({
    historySize: ensureValidNumber(historySize),
    mutable,
    past: [],
    present: state,
    future: [],
    produce,
    descriptors: createDescriptors(constants, getters, fluents, mappers)
  })
}
