#!/usr/bin/env bash
set -euo pipefail

UUID="codex-usage-cards@local"
REPO="https://github.com/kaicbosco/codex-usage-gnome.git"
DEST="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

if ! command -v git >/dev/null 2>&1; then
  echo "Erro: git não encontrado."
  exit 1
fi

if [[ -d "${DEST}/.git" ]]; then
  echo "A extensão já está instalada via Git. Atualizando..."
  git -C "${DEST}" pull --ff-only
else
  if [[ -e "${DEST}" ]]; then
    BACKUP="${DEST}.backup.$(date +%Y%m%d-%H%M%S)"
    echo "Já existe uma instalação em ${DEST}."
    echo "Movendo para backup: ${BACKUP}"
    mv "${DEST}" "${BACKUP}"
  fi

  mkdir -p "$(dirname "${DEST}")"
  git clone "${REPO}" "${DEST}"
fi

echo
if ! "${HOME}/.local/bin/codex-usage" --once --compact >/dev/null 2>&1; then
  echo "Aviso: ~/.local/bin/codex-usage não respondeu corretamente."
  echo "A extensão precisa desse comando para consultar os limites."
fi

echo
echo "Instalação concluída em:"
echo "  ${DEST}"
echo
echo "Faça logout/login no GNOME e habilite com:"
echo "  gnome-extensions enable ${UUID}"
echo
echo "Nas próximas versões, atualize com:"
echo "  git -C \"${DEST}\" pull --ff-only"
