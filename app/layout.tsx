export const metadata = {
  title: 'Api Perumdam Tirta Wilis',
  description: 'Api Perumdam Tirta Wilis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
