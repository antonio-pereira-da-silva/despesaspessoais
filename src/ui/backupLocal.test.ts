import { expect, it } from 'vitest';
import { lerUltimoBackup, precisaLembrarBackup, registrarBackup } from './backupLocal';

const agora = new Date('2026-09-26T12:00:00Z');

it('lembra quando o último backup tem mais de 30 dias', () => {
  expect(precisaLembrarBackup('2026-08-26T11:00:00Z', '2026-01-01', agora)).toBe(true);
  expect(precisaLembrarBackup('2026-09-01T12:00:00Z', '2026-01-01', agora)).toBe(false);
  expect(precisaLembrarBackup('lixo', '2026-01-01', agora)).toBe(true);
});

it('sem backup, só lembra quando há despesas de mais de 30 dias', () => {
  expect(precisaLembrarBackup(null, null, agora)).toBe(false);
  expect(precisaLembrarBackup(null, '2026-09-20', agora)).toBe(false);
  expect(precisaLembrarBackup(null, '2026-08-27', agora)).toBe(false);
  expect(precisaLembrarBackup(null, '2026-08-20', agora)).toBe(true);
});

it('guarda a data do último backup', () => {
  expect(lerUltimoBackup()).toBeNull();
  registrarBackup(agora);
  expect(lerUltimoBackup()).toBe('2026-09-26T12:00:00.000Z');
});
