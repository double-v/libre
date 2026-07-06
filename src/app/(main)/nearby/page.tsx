import { redirect } from 'next/navigation';

// « À proximité » est désormais un segment de l'onglet Découvrir.
export default function NearbyRedirect() {
  redirect('/discover');
}
