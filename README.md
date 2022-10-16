# Investigating assignability of `FastifyInstance` types

`FastifyInstance` has generic parameters with default types assigned to them.
While this allows referencing it without requiring inputs for all the type arguments,
it can lead to friction between `FastifyInstance` interfaces with custom types.

## Example

A fastify server with type-providers enabled will not be usable as input for the `@fastify/aws-lambda` plugin, which expects a `FastifyInstance` parameter.

```ts
export default function awsLambdaFastify<TEvent, TResult = LambdaResponse>(
  app: FastifyInstance,
  options?: LambdaFastifyOptions
): PromiseHandler<TEvent, TResult>;
```

## Cause

The assignability issue stems from certain methods of `FastifyInstance` being contravariant on `TypeProvider`. Because of that, the compiler has to flip the assignability check's direction, which boils down to the following outcome:

```diff
Types of property 'handler' are incompatible.
  Type 'RouteHandlerMethod<Server<typeof IncomingMessage, typeof ServerResponse>, IncomingMessage, ServerResponse<IncomingMessage>, ... 4 more ..., FastifyBaseLogger>' is not assignable to type 'RouteHandlerMethod<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, any, any, any, FastifyTypeProviderDefault, FastifyBaseLogger>'.
    Types of parameters 'request' and 'request' are incompatible.
      Type 'FastifyRequest<any, RawServerDefault, IncomingMessage, any, FastifyTypeProviderDefault, any, FastifyBaseLogger, ResolveFastifyRequestType<...>>' is not assignable to type 'FastifyRequest<any, Server<typeof IncomingMessage, typeof ServerResponse>, IncomingMessage, any, TypeBoxTypeProvider, any, FastifyBaseLogger, ResolveFastifyRequestType<...>>'.
        Type 'ResolveFastifyRequestType<FastifyTypeProviderDefault, any, any>' is not assignable to type 'ResolveFastifyRequestType<TypeBoxTypeProvider, any, any>'.
+          Type 'FastifyTypeProviderDefault' is not assignable to type 'TypeBoxTypeProvider'.
```

Normally, you'd expect the checks to be performed the other way around, e.g. check that `TypeBoxTypeProvider` is assignable to `FastifyTypeProviderDefault`, which would be true.

```ts
export interface FastifyTypeProvider {
  readonly input: unknown;
  readonly output: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FastifyTypeProviderDefault extends FastifyTypeProvider {}

export interface TypeBoxTypeProvider extends FastifyTypeProvider {
  output: this['input'] extends TSchema ? Static<this['input']> : never;
}
```

However, contravariance leads to checking whether `FastifyTypeProviderDefault` is assignable to `TypeBoxTypeProvider`, and that is false. Why?

```diff
export interface TypeBoxTypeProvider extends FastifyTypeProvider {
  output: this['input'] extends TSchema
    ? Static<this['input']>
+   : never;
}
```

As the [TypeScript handbook outlines](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#any-unknown-object-void-undefined-null-and-never-assignability), `unknown` cannot be assigned to `never`.

> unknown and never are like inverses of each other. Everything is assignable to unknown, never is assignable to everything. Nothing is assignable to never, unknown is not assignable to anything (except any).

## Potential solution

Depending on type-narrowing that happens in other parts of the codebase, it might be possible to replace `never` with `unknown` in custom type providers to make them substitutible with `FastifyTypeProviderDefault`:

```diff
export interface TypeBoxTypeProvider extends FastifyTypeProvider {
  output: this['input'] extends TSchema
    ? Static<this['input']>
-   : never;
+   : unknown;
}
```

For now, fastify's type tests are passing with changes based on the above, see https://github.com/fastify/fastify/compare/77b7582...driimus:fastify:test/type-provider-contravariance
