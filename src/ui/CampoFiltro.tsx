import { useId, useState } from 'react';

interface Props {
  rotulo: string;
  tipo: 'month' | 'date' | 'text';
  valor: string;
  valido: (texto: string) => boolean;
  aoMudar: (valor: string) => void;
}

/**
 * Campo de mês ou data que aceita digitação parcial (navegadores sem seletor nativo tratam
 * o campo como texto): só repassa valores válidos e volta ao último válido ao sair.
 */
export function CampoFiltro({ rotulo, tipo, valor, valido, aoMudar }: Props) {
  const id = useId();
  const [rascunho, setRascunho] = useState({ base: valor, texto: valor });
  const texto = rascunho.base === valor ? rascunho.texto : valor;

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        type={tipo}
        value={texto}
        onChange={(e) => {
          const novo = e.target.value;
          setRascunho({ base: valor, texto: novo });
          if (valido(novo) && novo !== valor) aoMudar(novo);
        }}
        onBlur={() => setRascunho({ base: valor, texto: valor })}
      />
    </div>
  );
}
