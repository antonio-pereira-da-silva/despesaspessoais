import { describe, expect, it } from 'vitest';
import { formatarBRL, parseValor, valorParaCampo } from './dinheiro';

const normalizar = (s: string) => s.replace(/\s/g, ' ');

describe('formatarBRL', () => {
  it('formata centavos em reais', () => {
    expect(normalizar(formatarBRL(123456))).toBe('R$ 1.234,56');
    expect(normalizar(formatarBRL(5))).toBe('R$ 0,05');
    expect(normalizar(formatarBRL(0))).toBe('R$ 0,00');
  });
});

describe('valorParaCampo', () => {
  it('gera texto editável sem símbolo', () => {
    expect(valorParaCampo(123456)).toBe('1234,56');
    expect(valorParaCampo(80000)).toBe('800,00');
  });
});

describe('parseValor', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12,34', 1234],
    ['12.34', 1234],
    ['10.5', 1050],
    ['1.234,56', 123456],
    ['1.234', 123400],
    ['R$ 10', 1000],
    [' 0,01 ', 1],
  ])('aceita %s', (texto, esperado) => {
    expect(parseValor(texto)).toBe(esperado);
  });

  it.each(['', '0', '0,00', '-5', 'abc', '12,345', '1,2,3', '12..3', '1.23.4'])(
    'recusa %s',
    (texto) => {
      expect(parseValor(texto)).toBeNull();
    },
  );
});
