import { describe, expect, it } from 'vitest';
import {
  ehDataValida,
  ehMesValido,
  formatarDiaMes,
  hojeISO,
  mesAnterior,
  mesAtual,
  mesDe,
  nomeDoMes,
  proximoMes,
  ultimoDiaDoMes,
} from './mes';

describe('mes', () => {
  it('usa a data local', () => {
    const agora = new Date(2026, 8, 5, 23, 30);
    expect(hojeISO(agora)).toBe('2026-09-05');
    expect(mesAtual(agora)).toBe('2026-09');
  });

  it('extrai o mês de uma data', () => {
    expect(mesDe('2026-12-31')).toBe('2026-12');
  });

  it('navega entre meses atravessando o ano', () => {
    expect(mesAnterior('2026-01')).toBe('2025-12');
    expect(proximoMes('2026-12')).toBe('2027-01');
    expect(proximoMes('2026-09')).toBe('2026-10');
  });

  it('nomeia o mês em português', () => {
    expect(nomeDoMes('2026-03')).toBe('março de 2026');
  });

  it('calcula o último dia do mês', () => {
    expect(ultimoDiaDoMes('2026-02')).toBe('2026-02-28');
    expect(ultimoDiaDoMes('2028-02')).toBe('2028-02-29');
    expect(ultimoDiaDoMes('2026-08')).toBe('2026-08-31');
  });

  it('valida formatos', () => {
    expect(ehMesValido('2026-09')).toBe(true);
    expect(ehMesValido('2026-13')).toBe(false);
    expect(ehMesValido('setembro')).toBe(false);
    expect(ehDataValida('2026-09-30')).toBe(true);
    expect(ehDataValida('')).toBe(false);
  });

  it('formata dia/mês', () => {
    expect(formatarDiaMes('2026-09-07')).toBe('07/09');
  });
});
