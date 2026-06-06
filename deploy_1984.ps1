$ErrorActionPreference = "Continue"

$keyPath = Join-Path $env:USERPROFILE ".ssh\id_ed25519"
$remoteCommand = "cd /opt/ghost-app/ghost-app; bash deploy.sh"

Write-Host "Deploying Ghost Control to 1984 VPS..."
& ssh -i $keyPath -o BatchMode=yes root@89.127.235.242 $remoteCommand
$exitCode = $LASTEXITCODE

Write-Host "SSH exit code: $exitCode"
exit $exitCode
