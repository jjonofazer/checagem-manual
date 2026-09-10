const fs = require('node:fs');
const crypto = require('node:crypto');
const forge = require('node-forge');

// Envelope encryption com o certificado .pfx: uma chave AES-256 aleatoria
// cifra os dados (rapido, autenticado via GCM), e so essa chave AES (32 bytes)
// e cifrada com a chave publica RSA do certificado. Formato do arquivo final:
//
//   [2 bytes]  tamanho da chave AES cifrada (uint16 big-endian)
//   [N bytes]  chave AES cifrada com RSA-OAEP (SHA-256)
//   [12 bytes] IV do AES-GCM
//   [16 bytes] tag de autenticacao do AES-GCM
//   [resto]    dados cifrados (ciphertext)

function loadPfx(pfxPath, password) {
  const der = fs.readFileSync(pfxPath, 'binary');
  const asn1 = forge.asn1.fromDer(der);
  const pfx = forge.pkcs12.pkcs12FromAsn1(asn1, password);

  let certPem = null;
  let privateKeyPem = null;

  pfx.safeContents.forEach((safeContents) => {
    safeContents.safeBags.forEach((safeBag) => {
      if (safeBag.cert) {
        certPem = forge.pki.certificateToPem(safeBag.cert);
      }
      if (safeBag.key) {
        privateKeyPem = forge.pki.privateKeyToPem(safeBag.key);
      }
    });
  });

  if (!certPem) {
    throw new Error(`Certificado nao encontrado dentro do PFX: ${pfxPath}`);
  }

  const publicKeyPem = forge.pki.publicKeyToPem(forge.pki.certificateFromPem(certPem).publicKey);
  return { publicKeyPem, privateKeyPem };
}

function encryptBuffer(data, publicKeyPem) {
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encryptedKey = crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey
  );

  const lengthPrefix = Buffer.alloc(2);
  lengthPrefix.writeUInt16BE(encryptedKey.length, 0);

  return Buffer.concat([lengthPrefix, encryptedKey, iv, authTag, ciphertext]);
}

function decryptBuffer(buffer, privateKeyPem) {
  if (!privateKeyPem) {
    throw new Error('Este PFX nao contem a chave privada; nao e possivel descriptografar com ele');
  }

  const keyLength = buffer.readUInt16BE(0);
  let offset = 2;

  const encryptedKey = buffer.subarray(offset, offset + keyLength);
  offset += keyLength;
  const iv = buffer.subarray(offset, offset + 12);
  offset += 12;
  const authTag = buffer.subarray(offset, offset + 16);
  offset += 16;
  const ciphertext = buffer.subarray(offset);

  const aesKey = crypto.privateDecrypt(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    encryptedKey
  );

  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Um backup no formato novo comeca com bytes binarios "arbitrarios" (o
// length-prefix + chave RSA cifrada); o formato antigo (CMS/Protect-CmsMessage)
// sempre gravava texto base64 puro. Da pra distinguir os dois sem guardar
// nenhum marcador extra no arquivo.
function looksLikeEnvelopeFormat(buffer) {
  if (buffer.length < 2) return false;
  const keyLength = buffer.readUInt16BE(0);
  // uma chave RSA cifrada de 2048/3072/4096 bits da 256/384/512 bytes
  return keyLength >= 128 && keyLength <= 1024 && buffer.length > 2 + keyLength + 12 + 16;
}

module.exports = { loadPfx, encryptBuffer, decryptBuffer, looksLikeEnvelopeFormat };
