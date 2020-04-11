export interface Collection<T> {
  [key: string]: T
}

export declare type Void = void | undefined

export declare type FluentMethod<S> = (this: S, ...args: any[]) => S | Partial<S> | Void
export declare type FluentMethods<S> = Collection<FluentMethod<S>>

export declare type NormalMethod<S> = (this: S, ...args: any[]) => any
export declare type NormalMethods<S> = Collection<NormalMethod<S>>

export declare type Arguments<T> = T extends (...args: infer A) => any ? A : unknown

export declare type Producer<S> = (
  state: S,
  mapper: (state: S) => S | Partial<S> | Void
) => S

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
}

export declare type Instance<
  S,
  F extends FluentMethods<S>,
  M extends NormalMethods<S>,
  C extends Collection<any>
> = {
  [K in keyof F]: (...args: Arguments<F[K]>) => Instance<S, F, M, C>
} & {
  [K in keyof M]: OmitThisParameter<M[K]>;
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
