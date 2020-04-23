export interface Collection<T> {
  [key: string]: T
}

export declare type StateMapper<S, R> = (state: S, ...args: any[]) => R

export declare type FluentOutput<S> = S | Partial<S> | undefined | void

export declare type FluentMethods<S> = Collection<StateMapper<S, FluentOutput<S>>>

export declare type NormalMethods<S> = Collection<StateMapper<S, any>>

export declare type Producer<S> = (state: S, mapper: (state: S) => FluentOutput<S>) => S

export interface Options<
  S,
  F extends FluentMethods<S>,
  M extends NormalMethods<S>,
  C extends Collection<any>
> {
  state?: S
  fluent?: F
  methods?: M
  constants?: C
  produce?: Producer<S>
  historySize?: number
  skipLocking?: boolean
  sharedState?: boolean
}

export declare type OmitState<T, S> = T extends (state: S, ...args: infer A) => infer R
  ? (...args: A) => R
  : any

export declare type SetResult<T, R> = T extends (...args: infer A) => any
  ? (...args: A) => R
  : any

export declare type Instance<
  S,
  F extends FluentMethods<S>,
  M extends NormalMethods<S>,
  C extends Collection<any>
> = {
  [K in keyof F]: SetResult<OmitState<F[K], S>, Instance<S, F, M, C>>
} & {
  [K in keyof M]: OmitState<M[K], S>
} & {
  [K in keyof C]: C[K]
} & {
  undo (steps?: number): Instance<S, F, M, C>
  redo (steps?: number): Instance<S, F, M, C>
}

declare function fluente<
  S,
  F extends FluentMethods<S>,
  M extends NormalMethods<S>,
  C extends Collection<any>
> (
  options: Options<S, F, M, C>
): Instance<S, F, M, C>;

export default fluente
