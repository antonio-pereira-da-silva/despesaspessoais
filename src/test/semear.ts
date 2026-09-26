import { abrirBanco } from '../storage/db';
import { criarRepositorio, type DadosCompletos } from '../storage/repositorio';

export async function semear(dados: Partial<DadosCompletos>): Promise<void> {
  const db = await abrirBanco();
  await criarRepositorio(db).substituirTudo({
    categorias: dados.categorias ?? [],
    limites: dados.limites ?? [],
    despesas: dados.despesas ?? [],
  });
  db.close();
}
