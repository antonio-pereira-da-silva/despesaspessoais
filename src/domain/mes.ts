import type { Mes } from './tipos';

const NOMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const doisDigitos = (n: number) => String(n).padStart(2, '0');

function partes(mes: Mes): [number, number] {
  const [ano, numero] = mes.split('-').map(Number);
  return [ano, numero];
}

const montar = (ano: number, numero: number): Mes => `${ano}-${doisDigitos(numero)}`;

export function hojeISO(agora: Date = new Date()): string {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

export function mesAtual(agora: Date = new Date()): Mes {
  return mesDe(hojeISO(agora));
}

export function mesDe(data: string): Mes {
  return data.slice(0, 7);
}

export function ehMesValido(texto: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(texto);
}

export function ehDataValida(texto: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(texto);
}

export function mesAnterior(mes: Mes): Mes {
  const [ano, numero] = partes(mes);
  return numero === 1 ? montar(ano - 1, 12) : montar(ano, numero - 1);
}

export function proximoMes(mes: Mes): Mes {
  const [ano, numero] = partes(mes);
  return numero === 12 ? montar(ano + 1, 1) : montar(ano, numero + 1);
}

export function nomeDoMes(mes: Mes): string {
  const [ano, numero] = partes(mes);
  return `${NOMES[numero - 1]} de ${ano}`;
}

export function ultimoDiaDoMes(mes: Mes): string {
  const [ano, numero] = partes(mes);
  return `${mes}-${doisDigitos(new Date(ano, numero, 0).getDate())}`;
}

export function formatarDiaMes(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

export function formatarDataCompleta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function nomeCurtoDoMes(mes: Mes): string {
  const [ano, numero] = partes(mes);
  return `${NOMES[numero - 1].slice(0, 3)}/${doisDigitos(ano % 100)}`;
}

export function formatarDataCurta(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(2, 4)}`;
}
