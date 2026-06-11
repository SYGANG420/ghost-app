$KeyPath = Join-Path $HOME ".ssh\ghost_codex_ed25519"
$DownloadDir = Join-Path $HOME "Downloads"
scp -i $KeyPath -o IdentitiesOnly=yes root@89.127.235.242:/opt/ghost-certs/device_a.p12 (Join-Path $DownloadDir "device_a.p12")
scp -i $KeyPath -o IdentitiesOnly=yes root@89.127.235.242:/opt/ghost-certs/device_b.p12 (Join-Path $DownloadDir "device_b.p12")
