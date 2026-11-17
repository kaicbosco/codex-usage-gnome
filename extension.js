import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const REFRESH_SECONDS = 15;

const THEMES = [
    ['gnome', 'GNOME'],
    ['glass', 'Glass'],
    ['tokyo', 'Tokyo Night'],
    ['industrial', 'Industrial Dark'],
    ['catppuccin', 'Catppuccin Mocha'],
    ['nord', 'Nord'],
    ['dracula', 'Dracula'],
    ['amoled', 'AMOLED'],
    ['cyberneon', 'Cyber Neon'],
    ['gruvbox', 'Gruvbox Dark'],
    ['nothing', 'Nothing OS'],
    ['macos', 'macOS Glass'],
    ['material', 'Material You'],
    ['steam', 'Steam'],
    ['cyberpunk', 'Cyberpunk 2077'],
    ['retrocrt', 'Retro CRT'],
    ['red', 'Crimson Red'],
];

const LAYOUTS = [
    ['cards', 'Cards'],
    ['text-progress', 'Text + Progress'],
];

const BAR_STYLES = [
    ['solid', 'Solid'],
    ['thin', 'Thin'],
    ['segmented', 'Segmented'],
];

function stateClass(percent) {
    if (percent === null)
        return 'unknown';
    if (percent <= 20)
        return 'danger';
    if (percent <= 50)
        return 'warn';
    return 'ok';
}

const UsageCard = GObject.registerClass(
class UsageCard extends St.BoxLayout {
    _init(label) {
        super._init({
            style_class: 'codex-usage-card',
            vertical: false,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._barStyle = 'solid';
        this._lastPercent = null;

        this._label = new St.Label({
            text: label,
            style_class: 'codex-usage-label',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._track = new St.Widget({
            style_class: 'codex-progress-track',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._fill = new St.Widget({
            style_class: 'codex-progress-fill unknown',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.FILL,
        });
        this._track.add_child(this._fill);

        this._segments = new St.BoxLayout({
            style_class: 'codex-segment-track',
            vertical: false,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._segmentActors = [];
        for (let i = 0; i < 10; i++) {
            const segment = new St.Widget({
                style_class: 'codex-segment empty',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._segmentActors.push(segment);
            this._segments.add_child(segment);
        }

        this._percent = new St.Label({
            text: '—%',
            style_class: 'codex-usage-percent',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._reset = new St.Label({
            text: '↻ —',
            style_class: 'codex-usage-reset',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.add_child(this._label);
        this.add_child(this._track);
        this.add_child(this._segments);
        this.add_child(this._percent);
        this.add_child(this._reset);

        this.setBarStyle('solid');
        this.setUsage(null, '—');
    }

    setBarStyle(style) {
        this._barStyle = style;
        const segmented = style === 'segmented';
        this._track.visible = !segmented;
        this._segments.visible = segmented;
        this.set_style_class_name(`codex-usage-card bar-${style}`);
        this._updateSegments(this._lastPercent);
    }

    _updateSegments(percent) {
        const state = stateClass(percent);
        const filledCount = percent === null
            ? 0
            : Math.max(0, Math.min(10, Math.round(percent / 10)));

        for (let i = 0; i < this._segmentActors.length; i++) {
            const filled = i < filledCount;
            this._segmentActors[i].set_style_class_name(
                `codex-segment ${filled ? `filled ${state}` : 'empty'}`
            );
        }
    }

    setUsage(percent, resetText) {
        this._lastPercent = percent;

        if (percent === null || Number.isNaN(percent)) {
            this._percent.set_text('—%');
            this._reset.set_text('↻ —');
            this._fill.set_width(0);
            this._fill.set_style_class_name('codex-progress-fill unknown');
            this._updateSegments(null);
            return;
        }

        const bounded = Math.max(0, Math.min(100, percent));
        this._percent.set_text(`${Math.round(bounded)}%`);
        this._reset.set_text(`↻ ${resetText}`);

        const width = Math.max(2, Math.round(76 * bounded / 100));
        this._fill.set_width(width);
        this._fill.set_style_class_name(`codex-progress-fill ${stateClass(bounded)}`);
        this._updateSegments(bounded);
    }
});

const CodexUsageIndicator = GObject.registerClass(
class CodexUsageIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'Codex Usage Cards', false);

        this._extension = extension;
        this._refreshing = false;

        this._theme = this._extension.loadPreference('theme', THEMES, 'gnome');
        this._layout = this._extension.loadPreference('layout', LAYOUTS, 'cards');
        this._barStyle = this._extension.loadPreference('bar-style', BAR_STYLES, 'solid');

        this._themeItems = new Map();
        this._layoutItems = new Map();
        this._barStyleItems = new Map();

        this._row = new St.BoxLayout({
            vertical: false,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._five = new UsageCard('5H');
        this._week = new UsageCard('WEEK');

        this._separator = new St.Label({
            text: '│',
            style_class: 'codex-inline-separator',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._row.add_child(this._five);
        this._row.add_child(this._separator);
        this._row.add_child(this._week);
        this.add_child(this._row);

        this._statusItem = new PopupMenu.PopupMenuItem('Status: carregando…', {reactive: false});
        this._fiveItem = new PopupMenu.PopupMenuItem('5 horas: —', {reactive: false});
        this._weekItem = new PopupMenu.PopupMenuItem('Semanal: —', {reactive: false});
        this._errorItem = new PopupMenu.PopupMenuItem('', {reactive: false});
        this._errorItem.actor.hide();

        this.menu.addMenuItem(this._statusItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._fiveItem);
        this.menu.addMenuItem(this._weekItem);
        this.menu.addMenuItem(this._errorItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._addChoiceSection('Tema', THEMES, this._themeItems, id => this.setTheme(id));
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._addChoiceSection('Layout', LAYOUTS, this._layoutItems, id => this.setLayout(id));
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._addChoiceSection('Bar style', BAR_STYLES, this._barStyleItems, id => this.setBarStyle(id));

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const refreshItem = new PopupMenu.PopupMenuItem('Atualizar agora');
        refreshItem.connect('activate', () => this.refresh());
        this.menu.addMenuItem(refreshItem);

        this._applyAppearance();
        this._updateChoiceMenus();
    }

    _addChoiceSection(title, choices, targetMap, handler) {
        const header = new PopupMenu.PopupMenuItem(title, {reactive: false});
        this.menu.addMenuItem(header);

        for (const [id, name] of choices) {
            const item = new PopupMenu.PopupMenuItem('');
            item.connect('activate', () => handler(id));
            targetMap.set(id, {item, name});
            this.menu.addMenuItem(item);
        }
    }

    _updateChoiceMap(map, selected) {
        for (const [id, data] of map) {
            const mark = id === selected ? '●' : '○';
            data.item.label.set_text(`${mark} ${data.name}`);
        }
    }

    _updateChoiceMenus() {
        this._updateChoiceMap(this._themeItems, this._theme);
        this._updateChoiceMap(this._layoutItems, this._layout);
        this._updateChoiceMap(this._barStyleItems, this._barStyle);
    }

    _applyAppearance() {
        this._row.set_style_class_name(
            `codex-usage-row theme-${this._theme} layout-${this._layout} barstyle-${this._barStyle}`
        );

        const textLayout = this._layout === 'text-progress';
        this._separator.visible = textLayout;

        this._five.setBarStyle(this._barStyle);
        this._week.setBarStyle(this._barStyle);
    }

    setTheme(theme) {
        if (!THEMES.some(([id]) => id === theme))
            return;
        this._theme = theme;
        this._extension.savePreference('theme', theme);
        this._applyAppearance();
        this._updateChoiceMenus();
    }

    setLayout(layout) {
        if (!LAYOUTS.some(([id]) => id === layout))
            return;
        this._layout = layout;
        this._extension.savePreference('layout', layout);
        this._applyAppearance();
        this._updateChoiceMenus();
    }

    setBarStyle(style) {
        if (!BAR_STYLES.some(([id]) => id === style))
            return;
        this._barStyle = style;
        this._extension.savePreference('bar-style', style);
        this._applyAppearance();
        this._updateChoiceMenus();
    }

    _spawnUsageCommand() {
        const helper = GLib.build_filenamev([
            this._extension.path,
            'codex_usage_helper.py',
        ]);

        return Gio.Subprocess.new(
            ['/usr/bin/python3', helper],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
    }

    async refresh() {
        if (this._refreshing)
            return;

        this._refreshing = true;
        this._statusItem.label.set_text('Status: atualizando…');
        this._errorItem.actor.hide();

        try {
            const proc = this._spawnUsageCommand();

            const [ok, stdout, stderr] = await new Promise((resolve, reject) => {
                proc.communicate_utf8_async(null, null, (p, result) => {
                    try {
                        resolve(p.communicate_utf8_finish(result));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            if (!ok)
                throw new Error('Falha ao executar helper de uso do Codex.');

            const err = (stderr ?? '').trim();
            if (err)
                throw new Error(err);

            let data;
            try {
                data = JSON.parse((stdout ?? '').trim());
            } catch (_) {
                throw new Error(`Saída inválida do helper: ${(stdout ?? '').trim() || '(vazia)'}`);
            }

            const fivePercent = Number(data?.five?.percent);
            const weekPercent = Number(data?.week?.percent);
            const fiveReset = data?.five?.reset ?? '—';
            const weekReset = data?.week?.reset ?? '—';

            if (!Number.isFinite(fivePercent) || !Number.isFinite(weekPercent))
                throw new Error('Helper não retornou percentuais válidos.');

            this._five.setUsage(fivePercent, fiveReset);
            this._week.setUsage(weekPercent, weekReset);

            this._fiveItem.label.set_text(
                `5 horas: ${fivePercent}% livre • reset em ${fiveReset}`
            );
            this._weekItem.label.set_text(
                `Semanal: ${weekPercent}% livre • reset em ${weekReset}`
            );
            this._statusItem.label.set_text('Status: conectado');
        } catch (e) {
            const message = String(e.message ?? e);
            this._five.setUsage(null, '—');
            this._week.setUsage(null, '—');
            this._statusItem.label.set_text('Status: erro');
            this._fiveItem.label.set_text('5 horas: indisponível');
            this._weekItem.label.set_text('Semanal: indisponível');
            this._errorItem.label.set_text(`Erro: ${message}`);
            this._errorItem.actor.show();
            logError(e, 'Codex Usage Cards');
        } finally {
            this._refreshing = false;
        }
    }
});

export default class CodexUsageCardsExtension extends Extension {
    enable() {
        this._indicator = new CodexUsageIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'left');
        this._indicator.refresh();

        this._timer = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            REFRESH_SECONDS,
            () => {
                this._indicator?.refresh();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    disable() {
        if (this._timer) {
            GLib.Source.remove(this._timer);
            this._timer = null;
        }

        this._indicator?.destroy();
        this._indicator = null;
    }

    _preferenceFile(name) {
        return Gio.File.new_for_path(
            GLib.build_filenamev([GLib.get_user_config_dir(), 'codex-usage-cards', name])
        );
    }

    loadPreference(name, choices, fallback) {
        try {
            const [ok, bytes] = this._preferenceFile(name).load_contents(null);
            if (ok) {
                const value = new TextDecoder().decode(bytes).trim();
                if (choices.some(([id]) => id === value))
                    return value;
            }
        } catch (_) {
            // Primeiro uso.
        }
        return fallback;
    }

    savePreference(name, value) {
        const dir = GLib.build_filenamev([
            GLib.get_user_config_dir(),
            'codex-usage-cards',
        ]);
        GLib.mkdir_with_parents(dir, 0o755);

        this._preferenceFile(name).replace_contents(
            new TextEncoder().encode(`${value}\n`),
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
        );
    }
}
