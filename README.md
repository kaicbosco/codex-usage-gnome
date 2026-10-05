# Codex Usage GNOME

Extensão para GNOME Shell que mostra, no painel, os limites de uso do Codex em duas janelas:

- 5 horas
- semanal

A extensão usa `~/.local/bin/codex-usage --once --compact` como fonte de dados.

## Recursos

- dois cards gráficos reais no painel
- barras de progresso em CSS
- cores por faixa de uso
- tempo até o próximo reset
- atualização automática a cada 15 segundos
- menu com detalhes
- botão `Atualizar agora`
- troca de tema pelo próprio menu
- tema persistente entre sessões

## Temas

- GNOME
- Glass
- Tokyo Night
- Industrial Dark

## Instalação

Clone diretamente para a pasta de extensões do GNOME:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions
git clone https://github.com/kaicbosco/codex-usage-gnome.git \
  ~/.local/share/gnome-shell/extensions/codex-usage-cards@local
```

Ou use o instalador do repositório:

```bash
git clone https://github.com/kaicbosco/codex-usage-gnome.git
cd codex-usage-gnome
chmod +x install.sh
./install.sh
```

Depois faça logout/login no GNOME e habilite:

```bash
gnome-extensions enable codex-usage-cards@local
```

Se ainda estiver usando o Executor para exibir o mesmo dado, desative esse indicador para evitar duplicação.

## Atualização

Como a instalação recomendada é um clone Git, atualizar fica simples:

```bash
cd ~/.local/share/gnome-shell/extensions/codex-usage-cards@local
git pull --ff-only
```

Depois recarregue a extensão:

```bash
gnome-extensions disable codex-usage-cards@local
gnome-extensions enable codex-usage-cards@local
```

Em Wayland, se alguma alteração visual não for aplicada, faça logout/login.

## Troca de tema

Clique nos cards do Codex no painel e escolha uma opção na seção `Tema`.

A escolha é salva em:

```text
~/.config/codex-usage-cards/theme
```

## Requisito

O comando abaixo precisa funcionar:

```bash
~/.local/bin/codex-usage --once --compact
```

## Faixas de uso

- acima de 50% restante: estado normal
- de 20% a 50%: atenção
- até 20%: crítico

## Estrutura

```text
.
├── extension.js
├── install.sh
├── metadata.json
├── README.md
└── stylesheet.css
```
