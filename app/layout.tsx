import { APP_STYLE } from './styles';

export const metadata = { title: 'eschool', description: 'eschool web' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: APP_STYLE }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
