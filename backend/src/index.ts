import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import { prisma } from './config/prisma';
import { HealthController } from './controllers/health.controller';
import { MessageController } from './controllers/message.controller';
import { SocketHandler } from './handlers/socket.handler';
import { HealthRepository } from './repositories/health.repository';
import { MessageRepository } from './repositories/message.repository';
import { HealthRoutes } from './routes/health.routes';
import { MessageRoutes } from './routes/message.routes';
import { WsRoutes } from './routes/ws.routes';
import { HealthService } from './services/health.service';
import { MessageService } from './services/message.service';
import { RealtimeService } from './services/realtime.service';

const server = Fastify({ logger: true });

await server.register(cors, { origin: true });
await server.register(sensible);
await server.register(websocket);

const realtime = new RealtimeService();
const healthRepository = new HealthRepository(prisma);
const messageRepository = new MessageRepository(prisma);
const healthService = new HealthService(healthRepository);
const messageService = new MessageService(messageRepository, realtime);

const healthController = new HealthController(healthService);
const messageController = new MessageController(messageService);
const socketHandler = new SocketHandler(messageService, realtime);

await server.register(
  async (api) => {
    new HealthRoutes(healthController).register(api);
    new MessageRoutes(messageController).register(api);
  },
  { prefix: '/api' },
);

await server.register(async (ws) => {
  new WsRoutes(socketHandler).register(ws);
});

async function start(): Promise<void> {
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';

  await server.listen({ port, host });
}

async function shutdown(signal: string): Promise<void> {
  server.log.info(`received ${signal}, shutting down`);
  await server.close();
  await prisma.$disconnect();
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

start().catch((error) => {
  server.log.error(error);
  process.exit(1);
});
