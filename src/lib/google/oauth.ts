// Solo lectura: nunca se piden permisos de escritura.
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable ${name}`);
  return v;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: env("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // fuerza que Google devuelva refresh_token
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      ...body,
    }),
    cache: "no-store",
  });
  return (await res.json()) as TokenResponse;
}

export function exchangeCode(code: string) {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: env("GOOGLE_REDIRECT_URI"),
  });
}

export function refreshAccessToken(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}
