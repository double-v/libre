import { redirect } from 'next/navigation';

// La liste des conversations vit désormais dans l'onglet Messages.
export default function ChatListRedirect() {
  redirect('/messages');
}
