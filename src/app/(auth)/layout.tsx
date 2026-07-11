import Logo from '@/components/Logo';
import ThemeMenu from '@/components/ui/ThemeMenu';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Barre minimale : la marque est déjà le Logo centré ci-dessous ; on
          n'expose ici que le ThemeMenu (theming accessible dès le login). */}
      <div className="flex justify-end px-4 pt-safe">
        <div className="py-2">
          <ThemeMenu />
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">{children}</div>
      </div>
    </div>
  );
}
