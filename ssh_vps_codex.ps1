$KeyPath = Join-Path $HOME ".ssh\ghost_codex_ed25519"
ssh -i $KeyPath -o IdentitiesOnly=yes root@89.127.235.242
