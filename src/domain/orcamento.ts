import { mesDe } from './mes';
import type {
  Categoria,
  Centavos,
  Despesa,
  Limite,
  Mes,
  ResumoCategoria,
  ResumoMes,
  StatusAlerta,
} from './tipos';

/** Limite do registro mais recente com vigenteDesde <= mes. */
export function limiteVigente(limites: Limite[], categoriaId: string, mes: Mes): Centavos | null {
  let vigente: Limite | null = null;
  for (const limite of limites) {
    if (
      limite.categoriaId === categoriaId &&
      limite.vigenteDesde <= mes &&
      (!vigente || limite.vigenteDesde > vigente.vigenteDesde)
    ) {
      vigente = limite;
    }
  }
  return vigente ? vigente.valor : null;
}

export function statusAlerta(gasto: Centavos, limite: Centavos | null): StatusAlerta {
  if (!limite) return 'sem-limite';
  if (gasto > limite) return 'estourado';
  if (gasto * 5 >= limite * 4) return 'atencao';
  return 'ok';
}

export function resumoCategoria(
  categoria: Categoria,
  limite: Centavos | null,
  gasto: Centavos,
): ResumoCategoria {
  const temLimite = limite !== null && limite > 0;
  return {
    categoria,
    limite: temLimite ? limite : null,
    gasto,
    restante: temLimite ? limite - gasto : null,
    percentual: temLimite ? (gasto / limite) * 100 : null,
    status: statusAlerta(gasto, limite),
  };
}

export function resumoDoMes(
  categorias: Categoria[],
  limites: Limite[],
  despesas: Despesa[],
  mes: Mes,
): ResumoMes {
  const gastos = new Map<string, Centavos>();
  for (const despesa of despesas) {
    if (mesDe(despesa.data) !== mes) continue;
    gastos.set(despesa.categoriaId, (gastos.get(despesa.categoriaId) ?? 0) + despesa.valor);
  }
  const itens = categorias
    .filter((c) => !c.arquivada || gastos.has(c.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((c) => resumoCategoria(c, limiteVigente(limites, c.id, mes), gastos.get(c.id) ?? 0));
  return {
    mes,
    categorias: itens,
    totalGasto: itens.reduce((soma, r) => soma + r.gasto, 0),
    totalLimites: itens.reduce((soma, r) => soma + (r.limite ?? 0), 0),
  };
}
