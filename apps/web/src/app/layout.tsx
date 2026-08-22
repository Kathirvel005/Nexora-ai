import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "NEXORA | AI Workforce Digital Twin & Predictive HR Intelligence Platform",
  description: "Don't just manage your workforce. Predict it. AI-assisted HR intelligence, organizational digital twins, and what-if simulation lab.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <body className="min-h-full bg-dark-bg text-foreground selection:bg-purple-500/30" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
