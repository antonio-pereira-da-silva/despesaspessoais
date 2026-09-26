import type { StatusAlerta } from '../domain/tipos';

interface Props {
  percentual: number | null;
  status: StatusAlerta;
  rotulo: string;
}

export function BarraProgresso({ percentual, status, rotulo }: Props) {
  const valor = Math.round(percentual ?? 0);
  return (
    <div
      className="barra"
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(valor, 100)}
      aria-valuetext={percentual === null ? 'sem limite' : `${valor}% do limite`}
    >
      <div
        className={`barra__preenchimento barra--${status}`}
        style={{ width: `${Math.min(percentual ?? 0, 100)}%` }}
      />
    </div>
  );
}
