import { env } from '../config/env.js';
import { pool } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function recordAuditChange({
  entityType,
  entityId,
  action,
  userId = null,
  changedFields = [],
  before = null,
  after = null,
  note = null,
}) {
  if (!env.db.enabled) {
    logger.info('Auditoria ignorada porque o banco esta desativado.', {
      entityType,
      entityId,
      action,
    });
    return null;
  }

  const [result] = await pool.execute(
    `INSERT INTO auditoria_alteracoes
      (entidade_tipo, entidade_id, acao, alterado_por_usuario_id, campos_alterados, dados_anteriores, dados_novos, observacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entityType,
      entityId,
      action,
      userId,
      JSON.stringify(changedFields),
      before === null ? null : JSON.stringify(before),
      after === null ? null : JSON.stringify(after),
      note,
    ],
  );

  return result.insertId;
}
