import awsLambdaFastify from '@fastify/aws-lambda';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import fastify from 'fastify';

export const app = fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

app.get(
  `/post/:id`,
  {
    schema: {
      params: Type.Object({
        id: Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { id } = req.params;

    res.send({ id });
  }
);

// `app` has a specialised `FastifyInstance` type, but it's not assignable to the default `FastifyInstance` generic
// @ts-expect-error
export const handler = awsLambdaFastify(app, {
  serializeLambdaArguments: false,
});
