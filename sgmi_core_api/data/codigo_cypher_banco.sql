-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
SHOW WARNINGS;
-- -----------------------------------------------------
-- Schema sgmi
-- -----------------------------------------------------
DROP SCHEMA IF EXISTS `sgmi` ;

-- -----------------------------------------------------
-- Schema sgmi
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `sgmi` DEFAULT CHARACTER SET utf8mb4 ;
SHOW WARNINGS;
USE `sgmi` ;

-- -----------------------------------------------------
-- Table `sgmi`.`ativos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`ativos` (
  `id_Ativo` INT(11) NOT NULL AUTO_INCREMENT,
  `Nome_Ativo` VARCHAR(100) NOT NULL,
  `Descricao` MEDIUMTEXT NOT NULL,
  `Fabricante` VARCHAR(100) NOT NULL,
  `Modelo` VARCHAR(100) NOT NULL,
  `Numero_Serie` VARCHAR(100) NOT NULL,
  `Data_Aquisicao` DATE NOT NULL,
  `Localizacao` VARCHAR(100) NOT NULL,
  `Status` ENUM('ativo', 'inativo', 'em manutenção', 'condenado') NOT NULL,
  `Imagem` LONGBLOB NOT NULL,
  PRIMARY KEY (`id_Ativo`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`cadastro_funcionario`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`cadastro_funcionario` (
  `id_Cadastro` INT(11) NOT NULL AUTO_INCREMENT,
  `Nome` VARCHAR(250) NOT NULL,
  `Email` VARCHAR(250) NOT NULL,
  `Senha` VARCHAR(200) NOT NULL,
  `Login` VARCHAR(45) NOT NULL,
  `Telefone` VARCHAR(45) NOT NULL,
  `CEP` VARCHAR(45) NOT NULL,
  `Cidade` VARCHAR(45) NOT NULL,
  `Bairro` VARCHAR(45) NOT NULL,
  `Rua` VARCHAR(45) NOT NULL,
  `Numero` VARCHAR(45) NOT NULL,
  `Complemento` VARCHAR(45) NULL DEFAULT NULL,
  `Sexo` ENUM('F', 'M', 'Feminino', 'Masculino') NOT NULL,
  `CPF` VARCHAR(100) NOT NULL,
  `Data_Nascimento` DATE NOT NULL,
  `Tipo_Usuario` ENUM('Administrador', 'Usuario', 'guest', 'Gestor') NOT NULL,
  `Cargo` VARCHAR(50) NOT NULL,
  `Departamento` VARCHAR(50) NOT NULL,
  `Data_Admissao` DATE NOT NULL,
  `Foto_Usuario` LONGBLOB NULL DEFAULT NULL,
  `Valor_Hora` DECIMAL(10,0) NULL DEFAULT NULL,
  PRIMARY KEY (`id_Cadastro`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`dados_sensores`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`dados_sensores` (
  `id_Dados` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `Topico` VARCHAR(255) NOT NULL,
  `Valor` VARCHAR(100) NOT NULL,
  `Data_Hora` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id_Dados`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`solicitacoes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`solicitacoes` (
  `id_Solicitacao` INT(11) NOT NULL AUTO_INCREMENT,
  `Titulo` VARCHAR(100) NOT NULL,
  `Solicitante` INT(11) NOT NULL,
  `Problema` VARCHAR(200) NOT NULL,
  `Prioridade` ENUM('Alta', 'Media', 'Baixa') NOT NULL,
  `Status` ENUM('Em Analise', 'Aceita', 'Recusada') NOT NULL,
  `id_Ativo` INT(11) NOT NULL,
  PRIMARY KEY (`id_Solicitacao`),
  CONSTRAINT `fk_solicitacoes_ativos1`
    FOREIGN KEY (`id_Ativo`)
    REFERENCES `sgmi`.`ativos` (`id_Ativo`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_solicitacoes_cadastro_funcionario`
    FOREIGN KEY (`Solicitante`)
    REFERENCES `sgmi`.`cadastro_funcionario` (`id_Cadastro`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`ordens_servico`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`ordens_servico` (
  `id_Ordem` INT(11) NOT NULL AUTO_INCREMENT,
  `id_Ativo` INT(11) NOT NULL,
  `Descricao_Problema` MEDIUMTEXT NOT NULL,
  `Data_Abertura` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `Status` ENUM('Aberta', 'Em Andamento', 'Concluida') NOT NULL,
  `Prioridade` ENUM('Alta', 'Media', 'Baixa') NOT NULL,
  `id_Solicitacao` INT(11) NOT NULL,
  `Data_Fechamento` DATETIME NULL DEFAULT NULL,
  `Custo` DECIMAL(10,2) NULL DEFAULT NULL,
  `Duracao` DECIMAL(10,2) NULL DEFAULT NULL,
  `Tipo_Manutencao` ENUM('Preditiva', 'Corretiva', 'Preventiva') NULL DEFAULT NULL,
  `id_Funcionario_Consertou` INT(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id_Ordem`),
  CONSTRAINT `fk_Ordens_Servico_Ativos1`
    FOREIGN KEY (`id_Ativo`)
    REFERENCES `sgmi`.`ativos` (`id_Ativo`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_ordens_servico_solicitacoes1`
    FOREIGN KEY (`id_Solicitacao`)
    REFERENCES `sgmi`.`solicitacoes` (`id_Solicitacao`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`funcionarios_ordens`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`funcionarios_ordens` (
  `id_Funcionario` INT(11) NOT NULL AUTO_INCREMENT,
  `Cadastro_Funcionario_id_Cadastro` INT(11) NOT NULL,
  `Ordens_Servico_id_Ordem` INT(11) NOT NULL,
  PRIMARY KEY (`id_Funcionario`),
  CONSTRAINT `fk_Funcionarios_Ordens_Cadastro_Funcionario1`
    FOREIGN KEY (`Cadastro_Funcionario_id_Cadastro`)
    REFERENCES `sgmi`.`cadastro_funcionario` (`id_Cadastro`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Funcionarios_Ordens_Ordens_Servico1`
    FOREIGN KEY (`Ordens_Servico_id_Ordem`)
    REFERENCES `sgmi`.`ordens_servico` (`id_Ordem`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`historico`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`historico` (
  `id_Manutencao` INT(11) NOT NULL AUTO_INCREMENT,
  `id_Ordem` INT(11) NOT NULL,
  `id_Ativo` INT(11) NOT NULL,
  `Descricao_Problema` MEDIUMTEXT NOT NULL,
  `Data_Abertura` DATETIME NOT NULL,
  `Data_Fechamento` DATETIME NULL DEFAULT NULL,
  `Status` ENUM('Aberta', 'Em Andamento', 'Concluida') NOT NULL,
  `Prioridade` ENUM('Alta', 'Media', 'Baixa') NOT NULL,
  `Custo` DECIMAL(10,2) NULL DEFAULT NULL,
  `Duracao` DECIMAL(10,2) NULL DEFAULT NULL,
  `Tipo_Manutencao` ENUM('Preditiva', 'Corretiva', 'Preventiva') NULL DEFAULT NULL,
  `Campo_Alterado` VARCHAR(50) NULL DEFAULT NULL,
  `Valor_Antigo` TEXT NULL DEFAULT NULL,
  `Valor_Novo` TEXT NULL DEFAULT NULL,
  `id_Solicitacao` INT(11) NOT NULL,
  `id_Funcionario_Consertou` INT(11) NULL DEFAULT NULL,
  `Data_Modificacao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id_Manutencao`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`historico_ativos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`historico_ativos` (
  `id_historico` INT(11) NOT NULL AUTO_INCREMENT,
  `id_Ativo` INT(11) NULL DEFAULT NULL,
  `Campo_Alterado` VARCHAR(100) NULL DEFAULT NULL,
  `Valor_Antigo` TEXT NULL DEFAULT NULL,
  `Valor_Novo` TEXT NULL DEFAULT NULL,
  `Data_Modificacao` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(),
  `Usuario` VARCHAR(100) NULL DEFAULT NULL,
  PRIMARY KEY (`id_historico`),
  CONSTRAINT `historico_ativos_ibfk_1`
    FOREIGN KEY (`id_Ativo`)
    REFERENCES `sgmi`.`ativos` (`id_Ativo`)
    ON DELETE SET NULL)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`historico_sensores`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`historico_sensores` (
  `id_historico` INT(11) NOT NULL AUTO_INCREMENT,
  `id_Sensor` INT(11) NOT NULL,
  `Campo_Alterado` VARCHAR(255) NOT NULL,
  `Valor_Antigo` TEXT NULL DEFAULT NULL,
  `Valor_Novo` TEXT NULL DEFAULT NULL,
  `Data_Modificacao` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(),
  `Usuario` VARCHAR(100) NULL DEFAULT NULL,
  PRIMARY KEY (`id_historico`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`pecas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`pecas` (
  `id_Peca` INT(11) NOT NULL AUTO_INCREMENT,
  `Nome_Peca` VARCHAR(45) NOT NULL,
  `Descricao` MEDIUMTEXT NOT NULL,
  `Fabricante` VARCHAR(45) NOT NULL,
  `Fornecedor` VARCHAR(45) NOT NULL,
  `Estoque` INT(11) NOT NULL,
  `Valor_Unitario` DECIMAL(10,2) NOT NULL,
  `Numero_Serie` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id_Peca`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`modelos_3d`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`modelos_3d` (
  `id_Modelo` INT(11) NOT NULL AUTO_INCREMENT,
  `id_Ativo` INT(11) NOT NULL,
  `Nome` VARCHAR(255) NOT NULL,
  `Arquivo` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id_Modelo`),
  CONSTRAINT `fk_modelos_3d_ativos`
    FOREIGN KEY (`id_Ativo`)
    REFERENCES `sgmi`.`ativos` (`id_Ativo`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`ordens_pecas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`ordens_pecas` (
  `id_Ordens_Peca` INT(11) NOT NULL AUTO_INCREMENT,
  `Quantidade` INT(11) NOT NULL,
  `id_Ordem` INT(11) NOT NULL,
  `id_Peca` INT(11) NOT NULL,
  PRIMARY KEY (`id_Ordens_Peca`),
  CONSTRAINT `fk_Ordens_Pecas_Ordens_Servico1`
    FOREIGN KEY (`id_Ordem`)
    REFERENCES `sgmi`.`ordens_servico` (`id_Ordem`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Ordens_Pecas_Pecas1`
    FOREIGN KEY (`id_Peca`)
    REFERENCES `sgmi`.`pecas` (`id_Peca`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `sgmi`.`sensores`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sgmi`.`sensores` (
  `id_Sensor` INT(11) NOT NULL AUTO_INCREMENT,
  `Nome_Sensor` VARCHAR(100) NOT NULL,
  `Tipo` VARCHAR(45) NOT NULL,
  `Unidade_Medida` VARCHAR(45) NOT NULL,
  `Status` ENUM('Ativo', 'Inativo', 'Em Manutenção') NOT NULL,
  `Modelo` VARCHAR(45) NOT NULL,
  `Numero_Serie` VARCHAR(45) NOT NULL,
  `id_Ativo` INT(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id_Sensor`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

SHOW WARNINGS;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
