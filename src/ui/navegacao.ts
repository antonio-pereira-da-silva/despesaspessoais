import { useLocation, useNavigate } from 'react-router';

/** Volta para a tela anterior; se o app foi aberto direto nesta tela, vai para o destino padrão. */
export function useVoltar(): (destinoPadrao: string) => void {
  const navigate = useNavigate();
  const location = useLocation();
  return (destinoPadrao) => {
    if (location.key !== 'default') void navigate(-1);
    else void navigate(destinoPadrao, { replace: true });
  };
}
