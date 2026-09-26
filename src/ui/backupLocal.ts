import { hojeISO } from '../domain/mes';

const CHAVE = 'despesas:ultimoBackup';
const DIAS_PARA_LEMBRAR = 30;

export function lerUltimoBackup(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function registrarBackup(agora: Date = new Date()): void {
  try {
    localStorage.setItem(CHAVE, agora.toISOString());
  } catch {
    // Sem localStorage o lembrete apenas continua aparecendo.
  }
}

/**
 * Lembra quando o último backup tem mais de 30 dias ou, se nunca houve backup,
 * quando há despesas registradas com data de mais de 30 dias atrás.
 */
export function precisaLembrarBackup(
  ultimo: string | null,
  primeiraDespesa: string | null,
  agora: Date = new Date(),
): boolean {
  if (!primeiraDespesa) return false;
  const limite = agora.getTime() - DIAS_PARA_LEMBRAR * 86_400_000;
  if (!ultimo) return primeiraDespesa < hojeISO(new Date(limite));
  return !(new Date(ultimo).getTime() >= limite);
}
