import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { montarBackup } from '../../storage/backup';
import { semear } from '../../test/semear';
import { App } from '../App';

const mercado = { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false };

function lerBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.readAsText(blob);
  });
}

beforeEach(async () => {
  window.location.hash = '#/ajustes';
  await semear({ categorias: [mercado] });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ajustes', () => {
  it('exporta um arquivo JSON com os dados e registra a data', async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:teste';
    });
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    expect(await screen.findByText('Nenhum backup exportado ainda.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exportar backup' }));
    expect(await screen.findByText('Backup exportado.')).toBeInTheDocument();
    expect(clique).toHaveBeenCalledOnce();
    const conteudo = JSON.parse(await lerBlob(blobs[0]));
    expect(conteudo).toMatchObject({ versao: 2, categorias: [mercado] });
    expect(screen.getByText(/Último backup:/)).toBeInTheDocument();
  });

  it('importa backup válido depois de confirmar', async () => {
    const user = userEvent.setup();
    const backup = montarBackup({
      categorias: [{ id: 'x', nome: 'Lazer', cor: '#e76f51', arquivada: false }],
      limites: [],
      despesas: [],
      entradas: [],
    });
    render(<App />);
    const arquivo = new File([JSON.stringify(backup)], 'backup.json', {
      type: 'application/json',
    });
    await user.upload(await screen.findByLabelText('Escolher arquivo de backup'), arquivo);
    expect(await screen.findByText(/1 categoria, 0 despesas e 0 entradas/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Substituir dados' }));
    expect(await screen.findByText('Backup importado.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Categorias' }));
    expect(await screen.findByText('Lazer')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Mercado/ })).not.toBeInTheDocument();
  });

  it('recusa arquivo inválido sem alterar os dados', async () => {
    const user = userEvent.setup();
    render(<App />);
    const arquivo = new File(['{"versao": 7}'], 'backup.json', { type: 'application/json' });
    await user.upload(await screen.findByLabelText('Escolher arquivo de backup'), arquivo);
    expect(await screen.findByRole('alert')).toHaveTextContent('Versão de backup não suportada');
    expect(screen.queryByRole('button', { name: 'Substituir dados' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Categorias' }));
    expect(await screen.findByRole('link', { name: /Mercado/ })).toBeInTheDocument();
  });
});
