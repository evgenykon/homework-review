import type { YandexConfig } from '../config/env';

const AUTHORIZE_URL = 'https://oauth.yandex.ru/authorize';
const TOKEN_URL = 'https://oauth.yandex.ru/token';
const PROFILE_URL = 'https://login.yandex.ru/info?format=json';

export type YandexProfile = {
  providerAccountId: string;
  name: string;
  photoUrl: string | null;
  email: string | null;
};

type YandexTokenResponse = {
  access_token?: string;
};

type YandexUserInfo = {
  id?: string;
  login?: string;
  display_name?: string;
  real_name?: string;
  default_email?: string;
  is_avatar_empty?: boolean;
  default_avatar_id?: string;
};

export class YandexOAuthService {
  constructor(private readonly config: YandexConfig) {}

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'login:info login:email login:avatar',
      state,
    });

    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<string> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Yandex token exchange failed with status ${response.status}`);
    }

    const data = (await response.json()) as YandexTokenResponse;

    if (!data.access_token) {
      throw new Error('Yandex token exchange returned no access_token');
    }

    return data.access_token;
  }

  async fetchProfile(accessToken: string): Promise<YandexProfile> {
    const response = await fetch(PROFILE_URL, {
      headers: { authorization: `OAuth ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Yandex profile request failed with status ${response.status}`);
    }

    const data = (await response.json()) as YandexUserInfo;

    if (!data.id) {
      throw new Error('Yandex profile response has no id');
    }

    return {
      providerAccountId: String(data.id),
      name: data.real_name || data.display_name || data.login || 'Yandex user',
      photoUrl:
        data.is_avatar_empty || !data.default_avatar_id
          ? null
          : `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`,
      email: data.default_email ?? null,
    };
  }
}
