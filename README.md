# Investigating assignability of `FastifyInstance` types

`FastifyInstance` has generic parameters with default types assigned to them.
While this allows referencing it without requiring inputs for all the type arguments,
it can lead to friction between `FastifyInstance` interfaces with custom types.

## Example

A fastify server with type-providers enabled will not be usable as input for the `@fastify/aws-lambda`, which expects the generic `FastifyInstance`.
