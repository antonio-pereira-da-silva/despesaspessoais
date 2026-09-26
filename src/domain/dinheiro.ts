import type { Centavos } from './tipos';

const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarBRL(valor: Centavos): string {
  return formatador.format(valor / 100);
}

/** Texto para preencher um campo: 1234 → "12,34". */
export function valorParaCampo(valor: Centavos): string {
  return (valor / 100).toFixed(2).replace('.', ',');
}

/** Converte o texto digitado em centavos; null se inválido ou não positivo. */
export function parseValor(texto: string): Centavos | null {
  let s = texto.replace(/R\$/g, '').replace(/\s/g, '');
  if (s.includes(',')) {
    s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!partes) return null;
  const centavos = Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
  return centavos > 0 && Number.isSafeInteger(centavos) ? centavos : null;
}
