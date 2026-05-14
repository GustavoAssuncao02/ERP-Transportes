CREATE DATABASE IF NOT EXISTS erp_transportes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE erp_transportes;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  nickname VARCHAR(80) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_nickname (nickname)
);

CREATE TABLE IF NOT EXISTS unidade (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  razao_social VARCHAR(180) NOT NULL,
  cnpj CHAR(14) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_unidade_cnpj (cnpj)
);

CREATE TABLE IF NOT EXISTS auditoria_alteracoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entidade_tipo ENUM('unidade', 'usuario') NOT NULL,
  entidade_id INT UNSIGNED NOT NULL,
  acao ENUM('criado', 'atualizado', 'removido') NOT NULL DEFAULT 'atualizado',
  alterado_por_usuario_id INT UNSIGNED NULL,
  alterado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  campos_alterados JSON NOT NULL,
  dados_anteriores JSON NULL,
  dados_novos JSON NULL,
  observacao VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_auditoria_entidade (entidade_tipo, entidade_id),
  KEY idx_auditoria_usuario (alterado_por_usuario_id),
  KEY idx_auditoria_data (alterado_em),
  CONSTRAINT fk_auditoria_usuario_alteracao
    FOREIGN KEY (alterado_por_usuario_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);
