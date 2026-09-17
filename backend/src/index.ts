import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import { loadConfig } from './config/env';
import { prisma } from './config/prisma';
import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { ChildController } from './controllers/child.controller';
import { HealthController } from './controllers/health.controller';
import { InviteController } from './controllers/invite.controller';
import { PageController } from './controllers/page.controller';
import { SocketHandler } from './handlers/socket.handler';
import { ChatSessionRepository } from './repositories/chat-session.repository';
import { HealthRepository } from './repositories/health.repository';
import { InviteRepository } from './repositories/invite.repository';
import { MessageRepository } from './repositories/message.repository';
import { OAuthAccountRepository } from './repositories/oauth-account.repository';
import { RoomPageRepository } from './repositories/room-page.repository';
import { SessionReadRepository } from './repositories/session-read.repository';
import { SessionRepository } from './repositories/session.repository';
import { StrokeRepository } from './repositories/stroke.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthRoutes } from './routes/auth.routes';
import { ChatRoutes } from './routes/chat.routes';
import { ChildRoutes } from './routes/child.routes';
import { HealthRoutes } from './routes/health.routes';
import { InviteRoutes } from './routes/invite.routes';
import { PageRoutes } from './routes/page.routes';
import { WsRoutes } from './routes/ws.routes';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { ChatSessionService } from './services/chat-session.service';
import { ChildService } from './services/child.service';
import { HealthService } from './services/health.service';
import { InviteService } from './services/invite.service';
import { PageService } from './services/page.service';
import { RealtimeService } from './services/realtime.service';
import { StorageService } from './services/storage.service';
import { YandexOAuthService } from './services/yandex-oauth.service';

const config = loadConfig();
const server = Fastify({ logger: true });

await server.register(cors, { origin: true, credentials: true });
await server.register(sensible);
await server.register(cookie);
await server.register(websocket);
await server.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });

const realtime = new RealtimeService();
const healthRepository = new HealthRepository(prisma);
const messageRepository = new MessageRepository(prisma);
const chatSessionRepository = new ChatSessionRepository(prisma);
const sessionReadRepository = new SessionReadRepository(prisma);
const roomPageRepository = new RoomPageRepository(prisma);
const strokeRepository = new StrokeRepository(prisma);
const userRepository = new UserRepository(prisma);
const oauthAccountRepository = new OAuthAccountRepository(prisma);
const sessionRepository = new SessionRepository(prisma);
const inviteRepository = new InviteRepository(prisma);
const yandexOAuthService = new YandexOAuthService(config.yandex);

const healthService = new HealthService(healthRepository);
const chatService = new ChatService(
  messageRepository,
  chatSessionRepository,
  sessionReadRepository,
  realtime,
);
const storageService = new StorageService(config);
const chatSessionService = new ChatSessionService(
  chatSessionRepository,
  userRepository,
  roomPageRepository,
  storageService,
  chatService,
  realtime,
);
const pageService = new PageService(
  storageService,
  roomPageRepository,
  strokeRepository,
  chatSessionService,
  chatService,
  realtime,
);
const inviteService = new InviteService(config, inviteRepository);
const childService = new ChildService(userRepository);
const authService = new AuthService(
  config,
  userRepository,
  oauthAccountRepository,
  sessionRepository,
  inviteService,
  yandexOAuthService,
);

const healthController = new HealthController(healthService);
const chatController = new ChatController(chatSessionService, chatService, authService);
const pageController = new PageController(pageService, chatSessionService, authService);
const authController = new AuthController(authService);
const inviteController = new InviteController(inviteService, authService);
const childController = new ChildController(childService, authService);
const socketHandler = new SocketHandler(authService, chatSessionService, chatService, realtime);

await server.register(
  async (api) => {
    new HealthRoutes(healthController).register(api);
    new AuthRoutes(authController).register(api);
    new InviteRoutes(inviteController).register(api);
    new ChildRoutes(childController).register(api);
    new ChatRoutes(chatController).register(api);
    new PageRoutes(pageController).register(api);
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
