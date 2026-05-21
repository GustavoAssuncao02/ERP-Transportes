export function notFoundHandler(request, response) {
  response.status(404).json({
    message: 'Nao encontramos a rota solicitada.',
    requestId: request.id,
    details: `${request.method} ${request.originalUrl}`,
  });
}
