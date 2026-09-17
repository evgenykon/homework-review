import type { YandexConfig } from '../config/env';

const AUTHORIZE_URL = 'https://oauth.yandex.ru/authorize';
const TOKEN_URL = 'https://oauth.yandex.ru/token';
const PROFILE_URL = 'https://login.yandex.ru/info?format=json';

export type YandexProfile = {
  providerAccountId: string;
  name: string;
  photoUrl: string | null;
  age: number | null;
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
  birthday?: string | null;
};

function calculateAge(birthday: string | null | undefined): number | null {
  if (!birthday) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Yandex fills unknown parts with zeros (e.g. 0000-12-23), so the age is unknown.
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const today = new Date();
  let age = today.getUTCFullYear() - year;
  const monthDelta = today.getUTCMonth() + 1 - month;

  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < day)) {
    age -= 1;
  }

  return age >= 0 && age <= 150 ? age : null;
}

export class YandexOAuthService {
  constructor(private readonly config: YandexConfig) {}

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'login:info login:email login:avatar login:birthday',
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
      age: calculateAge(data.birthday),
      email: data.default_email ?? null,
    };
  }
}
