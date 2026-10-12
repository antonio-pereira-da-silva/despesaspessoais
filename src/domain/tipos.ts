/** Mês no formato "AAAA-MM". */
export type Mes = string;
/** Valor em centavos (inteiro). */
export type Centavos = number;

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
  arquivada: boolean;
}

export interface Limite {
  id: string;
  categoriaId: string;
  valor: Centavos;
  vigenteDesde: Mes;
}

export interface Despesa {
  id: string;
  valor: Centavos;
  categoriaId: string;
  /** Data no formato "AAAA-MM-DD". */
  data: string;
  descricao?: string;
  criadaEm: string;
}

export type StatusAlerta = 'ok' | 'atencao' | 'estourado' | 'sem-limite';

export interface ResumoCategoria {
  categoria: Categoria;
  limite: Centavos | null;
  gasto: Centavos;
  restante: Centavos | null;
  percentual: number | null;
  status: StatusAlerta;
}

export interface ResumoMes {
  mes: Mes;
  categorias: ResumoCategoria[];
  totalGasto: Centavos;
  totalLimites: Centavos;
}

export interface Entrada {
  id: string;
  valor: Centavos;
  /** Data no formato "AAAA-MM-DD". */
  data: string;
  descricao?: string;
  criadaEm: string;
}
