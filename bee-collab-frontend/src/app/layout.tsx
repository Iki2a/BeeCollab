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
      <body>
        {children}
      </body>
    </html>
  );
}
