import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeeCollab | Seamless Collaboration",
  description: "Connect and collaborate with your team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning: some browser extensions inject attributes
          (e.g. bis_register, __processed_*) onto <body> before React hydrates,
          which would otherwise log a harmless hydration mismatch warning. */}
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
