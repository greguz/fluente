function mapValues (object, iteratee) {
  return Object.keys(object).reduce(
    (acc, key) => {
      acc[key] = iteratee(object[key], key)
      return acc
    },
    {}
  )
}

function takeRight (array, n) {
  return array.length > n
    ? array.slice(array.length - n)
    : array
}

function defaultProducer (context, mapper) {
  return Object.assign(
    {},
    context,
    mapper(context)
  )
}

function createState (options) {
  return {
    fluentMethods: options.fluent || {},
    normalMethods: options.methods || {},
    constants: options.constants || {},
    historySize: options.historySize || 10,
    isBranchable: !!options.branch,
    isLocked: false,
    past: [],
    present: options.state || {},
    future: [],
    produce: options.produce || defaultProducer
  }
}

function unwrapState (state) {
  if (state.isLocked) {
    throw new Error('Locked')
  }
  if (!state.isBranchable) {
    state.isLocked = true
  }
  return state.present
}

function updateState (state, context) {
  return {
    ...state,
    isLocked: false,
    past: takeRight([...state.past, state.present], state.historySize),
    present: context,
    future: []
  }
}

function undoState (state, steps = 1) {
  const past = [...state.past]
  let present = unwrapState(state)
  const future = [...state.future]
  for (let i = 0; i < steps && past.length > 0; i++) {
    future.push(present)
    present = past.pop()
  }
  return {
    ...state,
    isLocked: false,
    past,
    present,
    future
  }
}

function redoState (state, steps = 1) {
  const past = [...state.past]
  let present = unwrapState(state)
  const future = [...state.future]
  for (let i = 0; i < steps && future.length > 0; i++) {
    past.push(present)
    present = future.pop()
  }
  return {
    ...state,
    isLocked: false,
    past,
    present,
    future
  }
}

function fluentify (state, fn) {
  return function fluentMethod (...args) {
    return buildState(
      updateState(
        state,
        state.produce(
          unwrapState(state),
          context => fn(context, ...args)
        )
      )
    )
  }
}

function bind (state, fn) {
  return function normalMethod (...args) {
    return fn(unwrapState(state), ...args)
  }
}

function buildState (state) {
  return Object.assign(
    {
      undo (steps) {
        return buildState(undoState(state, steps))
      },
      redo (steps) {
        return buildState(redoState(state, steps))
      }
    },
    state.constants,
    mapValues(
      state.normalMethods,
      method => bind(state, method)
    ),
    mapValues(
      state.fluentMethods,
      method => fluentify(state, method)
    )
  )
}

module.exports = function fluente (options = {}) {
  return buildState(createState(options))
}
