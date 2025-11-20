export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: 'sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem' }}>404</h1>
            <p>Page not found</p>
            <a href="/dashboard" style={{ color: '#4f46e5' }}>Go to Dashboard</a>
          </div>
        </div>
      </body>
    </html>
  );
}