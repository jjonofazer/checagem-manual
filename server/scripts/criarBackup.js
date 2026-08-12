const { createEncryptedBackup } = require('../backup');

createEncryptedBackup('manual')
  .then((filePath) => {
    if (filePath) {
      console.log(`Backup criado: ${filePath}`);
    }
  })
  .catch((err) => {
    console.error('Falha ao criar backup:', err.message);
    process.exit(1);
  });
