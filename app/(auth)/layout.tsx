export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="bg-auth-mesh flex min-h-screen animate-fade-up flex-col items-center justify-center px-4 py-10"
    >
      {children}
    </main>
  );
}
