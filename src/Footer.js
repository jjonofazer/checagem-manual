import React from 'react';

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-glass">
        <p>SISTEMA DE CHECAGEM</p>
        <p>• J.A.V. Dev • © {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}

export default Footer;
