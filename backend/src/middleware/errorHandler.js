import { logger } from '../utils/logger.js';

export function errorHandler(error, request, response, _next) {
  const statusCode = error.statusCode ?? 500;
  const publicMessage = statusCode === 500
    ? 'Nao foi possivel concluir a operacao agora. Tente novamente em instantes.'
    : error.publicMessage || error.message;

  logger.error('Erro ao processar requisicao.', {
    requestId: request.id,
    method: request.method,
    url: request.originalUrl,
    statusCode,
    message: error.message,
    stack: error.stack,
  });

  response.status(statusCode).json({
    message: publicMessage,
    requestId: request.id,
  });
}
