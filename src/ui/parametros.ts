import { ehDataValida, ehMesValido, mesAtual } from '../domain/mes';
import type { Mes } from '../domain/tipos';

export function mesDaUrl(params: URLSearchParams): Mes {
  const mes = params.get('mes');
  return mes && ehMesValido(mes) ? mes : mesAtual();
}

/** Mês válido do parâmetro `nome`, ou o padrão. */
export function mesDoParametro(params: URLSearchParams, nome: string, padrao: Mes): Mes {
  const valor = params.get(nome);
  return valor && ehMesValido(valor) ? valor : padrao;
}

/** Data válida do parâmetro `nome`, ou o padrão. */
export function dataDoParametro(params: URLSearchParams, nome: string, padrao: string): string {
  const valor = params.get(nome);
  return valor && ehDataValida(valor) ? valor : padrao;
}
