import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ehMesValido } from '../domain/mes';
import { CampoFiltro } from './CampoFiltro';

// Sem seletor nativo (Firefox/Safari no computador), type="month" age como texto.
function Exemplo({ aoMudar }: { aoMudar: (v: string) => void }) {
  const [valor, setValor] = useState('2026-09');
  return (
    <CampoFiltro
      rotulo="De"
      tipo="text"
      valor={valor}
      valido={ehMesValido}
      aoMudar={(v) => {
        aoMudar(v);
        setValor(v);
      }}
    />
  );
}

describe('campo de filtro', () => {
  it('deixa digitar um valor parcial e só aplica quando fica válido', async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Exemplo aoMudar={aoMudar} />);
    const campo = screen.getByLabelText('De');
    await user.clear(campo);
    await user.type(campo, '2026-0');
    expect(campo).toHaveValue('2026-0');
    expect(aoMudar).not.toHaveBeenCalled();
    await user.type(campo, '7');
    expect(aoMudar).toHaveBeenLastCalledWith('2026-07');
    expect(campo).toHaveValue('2026-07');
  });

  it('volta ao último valor válido ao sair do campo', async () => {
    const user = userEvent.setup();
    render(<Exemplo aoMudar={vi.fn()} />);
    const campo = screen.getByLabelText('De');
    await user.clear(campo);
    await user.type(campo, '2026-1');
    await user.tab();
    expect(campo).toHaveValue('2026-09');
  });
});
