import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import { loadConfig } from './config/env';
import { prisma } from './config/prisma';
import { AuthController } from './controllers/auth.controller';
import { HealthController } from './controllers/health.controller';
import { MessageController } from './controllers/message.controller';
import { SocketHandler } from './handlers/socket.handler';
import { HealthRepository } from './repositories/health.repository';
import { MessageRepository } from './repositories/message.repository';
import { OAuthAccountRepository } from './repositories/oauth-account.repository';
import { SessionRepository } from './repositories/session.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthRoutes } from './routes/auth.routes';
import { HealthRoutes } from './routes/health.routes';
import { MessageRoutes } from './routes/message.routes';
import { WsRoutes } from './routes/ws.routes';
import { AuthService } from './services/auth.service';
import { HealthService } from './services/health.service';
import { MessageService } from './services/message.service';
import { RealtimeService } from './services/realtime.service';
import { YandexOAuthService } from './services/yandex-oauth.service';

const config = loadConfig();
const server = Fastify({ logger: true });

await server.register(cors, { origin: true, credentials: true });
await server.register(sensible);
await server.register(cookie);
await server.register(websocket);

const realtime = new RealtimeService();
const healthRepository = new HealthRepository(prisma);
const messageRepository = new MessageRepository(prisma);
const userRepository = new UserRepository(prisma);
const oauthAccountRepository = new OAuthAccountRepository(prisma);
const sessionRepository = new SessionRepository(prisma);
const yandexOAuthService = new YandexOAuthService(config.yandex);

const healthService = new HealthService(healthRepository);
const messageService = new MessageService(messageRepository, realtime);
const authService = new AuthService(
  config,
  userRepository,
  oauthAccountRepository,
  sessionRepository,
  yandexOAuthService,
);

const healthController = new HealthController(healthService);
const messageController = new MessageController(messageService);
const authController = new AuthController(authService);
const socketHandler = new SocketHandler(messageService, realtime);

await server.register(
  async (api) => {
    new HealthRoutes(healthController).register(api);
    new MessageRoutes(messageController).register(api);
    new AuthRoutes(authController).register(api);
  },
  { prefix: '/api' },
);

await server.register(async (ws) => {
  new WsRoutes(socketHandler).register(ws);
});

async function start(): Promise<void> {
  await server.listen({ port: config.port, host: config.host });
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
