import { getApiBaseUrl, getNgrokBypassHeaders } from '../config/env';

/**
 * Tüm HTTP istekleri için merkezi fetch sarmalayıcısı.
 * MVC QuestionsController şu an JSON API değil (View döner); ileride [ApiController] eklendiğinde buradan çağrılır.
 */
export function getApiClient() {
  const baseUrl = getApiBaseUrl();

  async function request(path, options = {}) {
    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = {
      Accept: 'application/json',
      ...getNgrokBypassHeaders(),
      ...options.headers,
    };
    if (options.body != null && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      const err = new Error(typeof data === 'string' ? data : res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    baseUrl,
    get: (path, opts) => request(path, { ...opts, method: 'GET' }),
    post: (path, body, opts) =>
      request(path, {
        ...opts,
        method: 'POST',
        body: body != null && typeof body === 'string' ? body : JSON.stringify(body),
      }),
    del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  };
}

export const api = getApiClient();
