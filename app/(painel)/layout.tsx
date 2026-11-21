import { Suspense } from 'react';
import { PainelProvider } from '@/components/PainelContexto';
import { Portao } from '@/components/Portao';

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PainelProvider>
        <Portao>{children}</Portao>
      </PainelProvider>
    </Suspense>
  );
}
