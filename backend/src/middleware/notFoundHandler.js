export function notFoundHandler(request, response) {
  response.status(404).json({
    message: `Rota não encontrada: ${request.method} ${request.originalUrl}`,
  });
}
