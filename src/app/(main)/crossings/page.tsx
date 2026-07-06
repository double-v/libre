import { redirect } from 'next/navigation';

// « Croisements » est désormais un segment de l'onglet Découvrir.
export default function CrossingsRedirect() {
  redirect('/discover');
}
