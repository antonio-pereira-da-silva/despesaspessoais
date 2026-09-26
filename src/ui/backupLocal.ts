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

export function precisaLembrarBackup(ultimo: string | null, agora: Date = new Date()): boolean {
  if (!ultimo) return true;
  const dias = (agora.getTime() - new Date(ultimo).getTime()) / 86_400_000;
  return !(dias <= DIAS_PARA_LEMBRAR);
}
