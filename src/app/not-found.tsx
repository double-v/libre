export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-gray-600 mb-6">Page introuvable</p>
      <a href="/" className="text-black underline">Retour &agrave; l&apos;accueil</a>
    </main>
  );
}