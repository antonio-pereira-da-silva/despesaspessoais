import { expect, it } from 'vitest';
import { lerUltimoBackup, precisaLembrarBackup, registrarBackup } from './backupLocal';

const agora = new Date('2026-09-26T12:00:00Z');

it('lembra quando nunca houve backup ou passou de 30 dias', () => {
  expect(precisaLembrarBackup(null, agora)).toBe(true);
  expect(precisaLembrarBackup('2026-08-26T11:00:00Z', agora)).toBe(true);
  expect(precisaLembrarBackup('2026-09-01T12:00:00Z', agora)).toBe(false);
  expect(precisaLembrarBackup('lixo', agora)).toBe(true);
});

it('guarda a data do último backup', () => {
  expect(lerUltimoBackup()).toBeNull();
  registrarBackup(agora);
  expect(lerUltimoBackup()).toBe('2026-09-26T12:00:00.000Z');
});
