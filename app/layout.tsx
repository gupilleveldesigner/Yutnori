import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "윷놀이 - 한국 전통 보드게임",
  description:
    "한국 전통 보드게임 윷놀이를 온라인으로 즐기세요. 드래그 앤 드롭으로 말을 이동하고, 업기·잡기·나기를 체험하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-screen w-screen">{children}</body>
    </html>
  );
}
