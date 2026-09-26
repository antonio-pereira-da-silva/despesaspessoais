import { ehMesValido, mesAtual } from '../domain/mes';
import type { Mes } from '../domain/tipos';

export function mesDaUrl(params: URLSearchParams): Mes {
  const mes = params.get('mes');
  return mes && ehMesValido(mes) ? mes : mesAtual();
}
