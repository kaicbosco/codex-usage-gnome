# Codex Usage GNOME

Extensão para GNOME Shell que mostra no painel os limites de uso do Codex nas janelas de 5 horas e semanal.

## Recursos

- atualização automática a cada 15 segundos
- percentual restante e tempo até o reset
- barras de progresso reais
- temas selecionáveis no próprio menu
- layouts selecionáveis independentemente do tema
- três estilos de barra para o layout Text + Progress
- preferências persistentes
- botão `Atualizar agora`
- coleta de dados pelo helper `codex_usage_helper.py`

## Layouts

### Cards

Layout tradicional com dois cards independentes:

```text
[ 5H   ━━━━━━━  97%  ↻ 2h41m ]   [ WEEK   ━━━━━━━  100%  ↻ 6d21h ]
```

### Text + Progress

Layout sem fundo e sem bordas, mantendo textos e barra:

```text
5H  ━━━━━━━  97%  ↻ 2h41m   │   WEEK  ━━━━━━━  100%  ↻ 6d21h
```

## Estilos de barra

No menu `Bar style`:

- **Solid** — barra mais espessa e preenchida
- **Thin** — linha fina e discreta
- **Segmented** — dez segmentos independentes

O estilo é aplicado instantaneamente e funciona junto com os temas.

## Temas

A extensão inclui:

- GNOME
- Glass
- Tokyo Night
- Industrial Dark
- Catppuccin Mocha
- Nord
- Dracula
- AMOLED
- Cyber Neon
- Gruvbox Dark
- Nothing OS
- macOS Glass
- Material You
- Steam
- Cyberpunk 2077
- Retro CRT

## Preferências persistentes

As escolhas são armazenadas em:

```text
~/.config/codex-usage-cards/theme
~/.config/codex-usage-cards/layout
~/.config/codex-usage-cards/bar-style
```

## Instalação

Clone diretamente para a pasta de extensões:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions

git clone https://github.com/kaicbosco/codex-usage-gnome.git \
  ~/.local/share/gnome-shell/extensions/codex-usage-cards@local
```

Depois faça logout/login no GNOME quando necessário e habilite:

```bash
gnome-extensions enable codex-usage-cards@local
```

## Atualização

```bash
cd ~/.local/share/gnome-shell/extensions/codex-usage-cards@local
git pull --ff-only
```

Depois recarregue:

```bash
gnome-extensions disable codex-usage-cards@local
gnome-extensions enable codex-usage-cards@local
```

Em Wayland, alterações grandes no GNOME Shell podem exigir logout/login.

## Uso

Clique no indicador no painel. O menu possui as seções:

```text
Tema
Layout
Bar style
Atualizar agora
```

Tema, layout e estilo da barra são independentes. Por exemplo:

```text
Tema: Tokyo Night
Layout: Text + Progress
Bar style: Thin
```

## Fonte dos dados

A extensão executa o helper incluído no repositório:

```text
codex_usage_helper.py
```

Ele conversa com o `codex app-server` e retorna as janelas de uso para a extensão.

## Faixas

- acima de 50% restante: normal
- de 20% a 50%: atenção
- até 20%: crítico

## Estrutura

```text
.
├── codex_usage_helper.py
├── extension.js
├── install.sh
├── metadata.json
├── README.md
└── stylesheet.css
```
