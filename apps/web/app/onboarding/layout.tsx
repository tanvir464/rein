import { WalletProviderShell } from '../../components/wallet-provider';
import { AuthProvider } from '../../components/auth-provider';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProviderShell>
      <AuthProvider>{children}</AuthProvider>
    </WalletProviderShell>
  );
}
