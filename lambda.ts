import express, { Express } from 'express';
import serverless from 'serverless-http';

import { ExpressMiddleware, ServiceManager } from './backend';
import config from './config';

const startup = async (): Promise<Express> => {
  const app = express();
  const serviceManager = new ServiceManager(config);
  const { middlewares, controllers } = serviceManager;
  ExpressMiddleware.attach(app, middlewares, controllers);
  return app;
};

exports.handler = async (event: AWSLambda.APIGatewayProxyEventV2, context: AWSLambda.Context) => {
  const app = await startup();
  const handler = serverless(app);
  return handler(event, context);
};
