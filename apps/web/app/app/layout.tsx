import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { MobileNavProvider } from '../../components/mobile-nav-provider';
import { WalletProviderShell } from '../../components/wallet-provider';
import { AuthProvider } from '../../components/auth-provider';
import { RequireAuth } from '../../components/require-auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProviderShell>
      <AuthProvider>
        <RequireAuth>
          <MobileNavProvider>
            <div className="flex min-h-[100dvh]">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1">{children}</main>
              </div>
            </div>
          </MobileNavProvider>
        </RequireAuth>
      </AuthProvider>
    </WalletProviderShell>
  );
} 
