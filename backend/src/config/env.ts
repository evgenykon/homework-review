export type YandexConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type AppConfig = {
  port: number;
  host: string;
  appUrl: string;
  sessionTtlMs: number;
  cookieSecure: boolean;
  yandex: YandexConfig;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? '0.0.0.0',
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    sessionTtlMs: Number(process.env.SESSION_TTL_DAYS ?? 30) * DAY_MS,
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    yandex: {
      clientId: process.env.YANDEX_CLIENT_ID ?? '',
      clientSecret: process.env.YANDEX_CLIENT_SECRET ?? '',
      redirectUri:
        process.env.YANDEX_REDIRECT_URI ?? 'http://localhost:3000/api/auth/yandex/callback',
    },
  };
}
