export interface Collection<T> {
  [key: string]: T
}

export declare type Getter<S> = (state: S) => any

export declare type Mapper<S> = (state: S, ...args: any[]) => S | Partial<S> | undefined | void

export declare type Method<S> = (state: S, ...args: any[]) => any

export declare type Produce<S> = (state: S, mapper: (state: S) => any) => S

export interface Options<
  S extends object,
  C extends Collection<any>,
  G extends Collection<Getter<S>>,
  F extends Collection<Mapper<S>>,
  M extends Collection<Method<S>>
> {
  state: S
  constants?: C
  getters?: G
  mappers?: F
  methods?: M
  historySize?: number
  mutable?: boolean
  produce?: Produce<S>
}

export declare type OmitState<T> = T extends (state: any, ...args: infer A) => infer R
  ? (...args: A) => R
  : never

export declare type SetResult<T, R> = T extends (...args: infer A) => any
  ? (...args: A) => R
  : never

export declare type GetResult<T> = T extends (state: any) => infer R
  ? R
  : never

export declare type Instance<
  S extends object,
  C extends Collection<any>,
  G extends Collection<Getter<S>>,
  F extends Collection<Mapper<S>>,
  M extends Collection<Method<S>>
> = {
  undo(steps?: number): Instance<S, C, G, F, M>
  redo(steps?: number): Instance<S, C, G, F, M>
} & {
  [K in keyof C]: C[K]
} & {
  [K in keyof G]: GetResult<G[K]>
} & {
  [K in keyof F]: SetResult<OmitState<F[K]>, Instance<S, C, G, F, M>>
} & {
  [K in keyof M]: OmitState<M[K]>
}

declare function fluente<
  S extends object,
  C extends Collection<any>,
  G extends Collection<Getter<S>>,
  F extends Collection<Mapper<S>>,
  M extends Collection<Method<S>>
>(
  options: Options<S, C, G, F, M>
): Instance<S, C, G, F, M>;

export default fluente
