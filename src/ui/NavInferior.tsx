import { NavLink } from 'react-router';

const ITENS = [
  { para: '/', rotulo: 'Mês', icone: '📅' },
  { para: '/caixa', rotulo: 'Caixa', icone: '📊' },
  { para: '/categorias', rotulo: 'Categorias', icone: '🏷️' },
  { para: '/ajustes', rotulo: 'Ajustes', icone: '⚙️' },
];

export function NavInferior() {
  return (
    <nav className="nav-inferior" aria-label="Principal">
      {ITENS.map((item) => (
        <NavLink
          key={item.para}
          to={item.para}
          end={item.para === '/'}
          className="nav-inferior__item"
        >
          <span aria-hidden="true">{item.icone}</span>
          {item.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
