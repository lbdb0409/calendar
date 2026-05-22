import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hours for Dad",
  description: "Track weekly hours and send a clean summary to dad.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="relative z-10 min-h-dvh">{children}</div>
      </body>
    </html>
  );
}
