import crypto from 'node:crypto';

export function requestContext(request, response, next) {
  const requestId = request.get('x-request-id') || crypto.randomUUID();

  request.id = requestId;
  response.setHeader('X-Request-Id', requestId);
  next();
}
