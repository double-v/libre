import { redirect } from 'next/navigation';

/** La file « Profils à vérifier » vit désormais dans la page Indices (spec 011, US2). */
export default function AdminProfilsPage() {
  redirect('/admin/indices');
}
