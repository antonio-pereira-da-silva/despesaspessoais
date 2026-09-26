import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { abrirBanco } from '../storage/db';
import { criarRepositorio, type Repositorio } from '../storage/repositorio';
import { DadosProvider } from './DadosProvider';
import { NavInferior } from './NavInferior';
import { TelaCategoria } from './telas/TelaCategoria';
import { TelaCategorias } from './telas/TelaCategorias';
import { TelaDespesa } from './telas/TelaDespesa';
import { TelaDetalheCategoria } from './telas/TelaDetalheCategoria';
import { TelaMes } from './telas/TelaMes';

type Estado = { tipo: 'carregando' } | { tipo: 'erro' } | { tipo: 'pronto'; repo: Repositorio };

export function App() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  useEffect(() => {
    let ativo = true;
    abrirBanco().then(
      (db) => {
        if (ativo) setEstado({ tipo: 'pronto', repo: criarRepositorio(db) });
      },
      () => {
        if (ativo) setEstado({ tipo: 'erro' });
      },
    );
    navigator.storage?.persist?.().catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  if (estado.tipo === 'carregando') return <p className="aviso">Carregando…</p>;
  if (estado.tipo === 'erro') {
    return (
      <main className="conteudo">
        <h1>Não foi possível abrir seus dados</h1>
        <p>
          O app precisa do armazenamento do navegador para guardar suas despesas. Se estiver numa
          janela privada ou anônima, abra o app numa janela normal.
        </p>
      </main>
    );
  }

  return (
    <HashRouter>
      <DadosProvider repo={estado.repo}>
        <main className="conteudo">
          <Routes>
            <Route path="/" element={<TelaMes />} />
            <Route path="/categoria/:id" element={<TelaDetalheCategoria />} />
            <Route path="/categorias" element={<TelaCategorias />} />
            <Route path="/categorias/nova" element={<TelaCategoria />} />
            <Route path="/categorias/:id" element={<TelaCategoria />} />
            <Route path="/despesa/nova" element={<TelaDespesa />} />
            <Route path="/despesa/:id" element={<TelaDespesa />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <NavInferior />
      </DadosProvider>
    </HashRouter>
  );
}
