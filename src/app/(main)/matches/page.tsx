import { redirect } from 'next/navigation';

// Matches et conversations sont désormais réunis dans l'onglet Messages.
export default function MatchesRedirect() {
  redirect('/messages');
}
