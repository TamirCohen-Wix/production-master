/**
 * Wix Serverless entry point.
 *
 * Wraps the Express application inside FunctionsBuilder so it can be
 * served by the Wix Serverless runtime. Workers run as a separate
 * container — only the HTTP API is exposed here.
 */

import { FunctionsBuilder } from '@wix/serverless-api';
import { createExpressApp } from './api/server.js';

const APP_DEF_ID = process.env.WIX_APP_DEF_ID ?? 'production-master';

export default new FunctionsBuilder()
  .withAppDefId(APP_DEF_ID)
  .withAppSecret({ configKey: 'appSecret' })
  .addHttpService(createExpressApp());
