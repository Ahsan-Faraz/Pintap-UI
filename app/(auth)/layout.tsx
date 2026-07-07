export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="bg-auth-mesh flex min-h-screen flex-col items-center justify-center px-4 py-10 [&:has(.auth-split-screen)]:block [&:has(.auth-split-screen)]:bg-transparent [&:has(.auth-split-screen)]:p-0"
    >
      {children}
    </main>
  );
}
