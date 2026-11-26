import serverless from 'serverless-http';
import { createApp } from '../server.ts';

let appPromise: Promise<Awaited<ReturnType<typeof createApp>>> | null = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return serverless(app)(req, res);
}
