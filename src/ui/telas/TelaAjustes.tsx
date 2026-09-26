import { useId, useState, type ChangeEvent } from 'react';
import { formatarDataCompleta, hojeISO } from '../../domain/mes';
import { ErroBackup, lerBackup, montarBackup, type DadosBackup } from '../../storage/backup';
import { lerUltimoBackup, registrarBackup } from '../backupLocal';
import { useDados } from '../dados';

type Mensagem = { tipo: 'erro' | 'sucesso'; texto: string };

const plural = (n: number, singular: string, pluralTexto: string) =>
  `${n} ${n === 1 ? singular : pluralTexto}`;

function lerArquivo(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsText(arquivo);
  });
}

function baixar(arquivo: File): void {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = arquivo.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TelaAjustes() {
  const { repo, aposAlterar } = useDados();
  const idArquivo = useId();
  const [ultimoBackup, setUltimoBackup] = useState(lerUltimoBackup);
  const [pendente, setPendente] = useState<DadosBackup | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  async function exportar() {
    setMensagem(null);
    try {
      const backup = montarBackup(await repo.exportarTudo());
      baixar(
        new File([JSON.stringify(backup, null, 2)], `despesas-backup-${hojeISO()}.json`, {
          type: 'application/json',
        }),
      );
      registrarBackup();
      setUltimoBackup(lerUltimoBackup());
      setMensagem({ tipo: 'sucesso', texto: 'Backup exportado.' });
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível exportar o backup.' });
    }
  }

  async function escolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    setMensagem(null);
    setPendente(null);
    if (!arquivo) return;
    try {
      setPendente(lerBackup(await lerArquivo(arquivo)));
    } catch (erro) {
      setMensagem({
        tipo: 'erro',
        texto: erro instanceof ErroBackup ? erro.message : 'Não foi possível ler o arquivo.',
      });
    }
  }

  async function confirmarImportacao() {
    if (!pendente) return;
    try {
      await repo.substituirTudo(pendente);
      await aposAlterar();
      setPendente(null);
      setMensagem({ tipo: 'sucesso', texto: 'Backup importado.' });
    } catch {
      setMensagem({
        tipo: 'erro',
        texto: 'Não foi possível importar. Seus dados não foram alterados.',
      });
    }
  }

  return (
    <>
      <header className="cabecalho">
        <h1>Ajustes</h1>
      </header>
      <section className="secao">
        <h2>Backup</h2>
        <p>
          Seus dados ficam só neste aparelho. Exporte um backup de vez em quando e guarde o arquivo
          num lugar seguro.
        </p>
        <p className="subtitulo">
          {ultimoBackup
            ? `Último backup: ${formatarDataCompleta(ultimoBackup)}`
            : 'Nenhum backup exportado ainda.'}
        </p>
        <button type="button" className="botao botao--primario" onClick={exportar}>
          Exportar backup
        </button>
      </section>
      <section className="secao">
        <h2>Restaurar</h2>
        <p>Importar um backup substitui todos os dados atuais.</p>
        <label htmlFor={idArquivo} className="botao">
          Escolher arquivo de backup
        </label>
        <input
          id={idArquivo}
          type="file"
          accept="application/json,.json"
          className="oculto"
          onChange={escolherArquivo}
        />
        {pendente && (
          <div className="confirmacao">
            <p>
              Substituir todos os dados por este backup com{' '}
              {plural(pendente.categorias.length, 'categoria', 'categorias')} e{' '}
              {plural(pendente.despesas.length, 'despesa', 'despesas')}?
            </p>
            <div className="acoes">
              <button type="button" className="botao botao--perigo" onClick={confirmarImportacao}>
                Substituir dados
              </button>
              <button type="button" className="botao" onClick={() => setPendente(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
      {mensagem && (
        <p role={mensagem.tipo === 'erro' ? 'alert' : 'status'} className={mensagem.tipo}>
          {mensagem.texto}
        </p>
      )}
    </>
  );
}
