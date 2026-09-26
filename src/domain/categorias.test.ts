import { expect, it } from 'vitest';
import { mesmoNome } from './categorias';

it('compara nomes ignorando maiúsculas e espaços', () => {
  expect(mesmoNome(' Mercado ', 'mercado')).toBe(true);
  expect(mesmoNome('Saúde', 'SAÚDE')).toBe(true);
  expect(mesmoNome('Lazer', 'Transporte')).toBe(false);
});
