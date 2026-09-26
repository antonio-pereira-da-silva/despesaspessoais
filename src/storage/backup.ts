import { ehDataValida, ehMesValido } from '../domain/mes';
import type { Categoria, Despesa, Limite } from '../domain/tipos';
import type { DadosCompletos } from './repositorio';

export interface DadosBackup extends DadosCompletos {
  versao: 1;
  exportadoEm: string;
}

export class ErroBackup extends Error {}

type Registro = Record<string, unknown>;

const ehObjeto = (v: unknown): v is Registro =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const ehTexto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const ehInteiro = (v: unknown, minimo: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= minimo;

function lista(json: Registro, campo: string): Registro[] {
  const valor = json[campo];
  if (!Array.isArray(valor) || !valor.every(ehObjeto)) {
    throw new ErroBackup(`Backup inválido: "${campo}" está ausente ou com formato errado.`);
  }
  return valor;
}

export function montarBackup(dados: DadosCompletos, agora: Date = new Date()): DadosBackup {
  return { versao: 1, exportadoEm: agora.toISOString(), ...dados };
}

export function lerBackup(texto: string): DadosBackup {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new ErroBackup('O arquivo não é um backup válido.');
  }
  return validarBackup(json);
}

export function validarBackup(json: unknown): DadosBackup {
  if (!ehObjeto(json)) throw new ErroBackup('O arquivo não é um backup válido.');
  if (json.versao !== 1) throw new ErroBackup('Versão de backup não suportada.');

  const categorias = lista(json, 'categorias').map((c, i): Categoria => {
    if (!ehTexto(c.id) || !ehTexto(c.nome) || !ehTexto(c.cor) || typeof c.arquivada !== 'boolean') {
      throw new ErroBackup(`Backup inválido: categoria ${i + 1} está incompleta.`);
    }
    return { id: c.id, nome: c.nome, cor: c.cor, arquivada: c.arquivada };
  });
  const ids = new Set(categorias.map((c) => c.id));

  const limites = lista(json, 'limites').map((l, i): Limite => {
    if (
      !ehTexto(l.id) ||
      !ehTexto(l.categoriaId) ||
      !ids.has(l.categoriaId) ||
      !ehInteiro(l.valor, 0) ||
      !ehTexto(l.vigenteDesde) ||
      !ehMesValido(l.vigenteDesde)
    ) {
      throw new ErroBackup(`Backup inválido: limite ${i + 1} está incorreto.`);
    }
    return { id: l.id, categoriaId: l.categoriaId, valor: l.valor, vigenteDesde: l.vigenteDesde };
  });

  const despesas = lista(json, 'despesas').map((d, i): Despesa => {
    if (
      !ehTexto(d.id) ||
      !ehTexto(d.categoriaId) ||
      !ids.has(d.categoriaId) ||
      !ehInteiro(d.valor, 1) ||
      !ehTexto(d.data) ||
      !ehDataValida(d.data) ||
      !ehTexto(d.criadaEm) ||
      (d.descricao !== undefined && typeof d.descricao !== 'string')
    ) {
      throw new ErroBackup(`Backup inválido: despesa ${i + 1} está incorreta.`);
    }
    const despesa: Despesa = {
      id: d.id,
      valor: d.valor,
      categoriaId: d.categoriaId,
      data: d.data,
      criadaEm: d.criadaEm,
    };
    if (typeof d.descricao === 'string') despesa.descricao = d.descricao;
    return despesa;
  });

  const exportadoEm = typeof json.exportadoEm === 'string' ? json.exportadoEm : '';
  return { versao: 1, exportadoEm, categorias, limites, despesas };
}
