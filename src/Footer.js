import React from 'react';

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-glass">
        <p>CHECAGEM DE SISTEMAS</p>
        <p>© {new Date().getFullYear()} Jonathan Almeida Vieira</p>
      </div>
    </footer>
  );
}

export default Footer;
