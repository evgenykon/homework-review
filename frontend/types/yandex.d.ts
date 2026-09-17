export {}

declare global {
  interface YandexSuggestToken {
    access_token?: string
    token?: string
  }

  interface YandexSuggestInitResult extends YandexSuggestToken {
    handler?: () => Promise<YandexSuggestToken>
  }

  interface YandexAuthSuggest {
    init: (
      oauthQueryParams: Record<string, string>,
      tokenPageOrigin: string,
      suggestParams?: Record<string, string | number>,
    ) => Promise<YandexSuggestInitResult>
  }

  interface Window {
    YaAuthSuggest?: YandexAuthSuggest
    YaSendSuggestToken?: (tokenPageOrigin: string, options: { flag: boolean }) => void
  }
}
