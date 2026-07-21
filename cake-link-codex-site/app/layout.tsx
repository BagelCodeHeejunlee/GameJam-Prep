import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "케이크 링크",
  description: "같은 조각 케이크 6개를 한 판에 모으는 스테이지 퍼즐 게임",
  icons: {
    icon: "/game/og.png",
    shortcut: "/game/og.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
