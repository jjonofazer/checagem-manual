$ErrorActionPreference = 'Stop'

$certPath = 'C:\checagem-manual\backup-keys\backup-checagem.pfx'
$subject = 'CN=Backup-Checagem-Manual-CVB'

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $certPath) | Out-Null

if (Test-Path -LiteralPath $certPath) {
  $backupPath = "$certPath.antigo-$(Get-Date -Format yyyyMMdd-HHmmss)"
  Copy-Item -LiteralPath $certPath -Destination $backupPath
  Write-Host "PFX anterior preservado em: $backupPath"
}

$senhaPfx = Read-Host 'Digite a senha do arquivo PFX' -AsSecureString

$cert = New-SelfSignedCertificate `
  -Type DocumentEncryptionCert `
  -Subject $subject `
  -CertStoreLocation 'Cert:\CurrentUser\My' `
  -KeyAlgorithm RSA -KeyLength 4096 `
  -KeyUsage KeyEncipherment,DataEncipherment `
  -KeyExportPolicy Exportable `
  -NotAfter (Get-Date).AddYears(10)

Export-PfxCertificate `
  -Cert $cert `
  -FilePath $certPath `
  -Password $senhaPfx `
  -Force | Out-Null

Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -DeleteKey -ErrorAction SilentlyContinue

Write-Host ''
Write-Host "Certificado de backup criado em: $certPath"
Write-Host "Thumbprint: $($cert.Thumbprint)"
Write-Host ''
Write-Host 'Use a mesma senha em BACKUP_PFX_PASSWORD no arquivo server\.env.'
