export const HTTP_DEFAULTS = {
  corsAllowedMethods: [
    'GET',
    'HEAD',
    'PUT',
    'PATCH',
    'POST',
    'DELETE',
    'OPTIONS',
  ],
  jsonBodyLimitBytes: 1024 * 1024,
  urlencodedBodyLimitBytes: 100 * 1024,
  contentSecurityPolicy:
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://validator.swagger.io; font-src 'self' data:",
};

export type HttpDefaults = typeof HTTP_DEFAULTS;
