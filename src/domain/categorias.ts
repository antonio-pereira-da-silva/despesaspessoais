export const CORES = [
  '#2a9d8f',
  '#e76f51',
  '#e9c46a',
  '#457b9d',
  '#8e7dbe',
  '#f4a261',
  '#d62828',
  '#6a994e',
];

export const SUGESTOES = ['Mercado', 'Transporte', 'Moradia', 'Lazer', 'Saúde'];

const normalizar = (nome: string) => nome.trim().toLocaleLowerCase('pt-BR');

export function mesmoNome(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b);
}
