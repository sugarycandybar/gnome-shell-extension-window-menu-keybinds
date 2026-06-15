import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as WindowMenu from 'resource:///org/gnome/shell/ui/windowMenu.js';

const SHORTCUT_MAP = {
    'Always on Top': 't',
    'Always on Visible Workspace': 'v',
    'Close': 'c',
    'Maximize': 'x',
    'Restore': 'e',
    'Hide': 'h',
    'Move': 'm',
    'Resize': 'z',
    'Move to Workspace Left': 'l',
    'Move to Workspace Right': 'r',
};

const SHORTCUT_KEY = Symbol('windowMenuShortcutKey');
const HANDLER_ID = Symbol('windowMenuKeyHandler');

let _origBuildMenu = null;

export default class WindowMenuKeybinds extends Extension {
    enable() {
        const proto = WindowMenu.WindowMenu.prototype;
        _origBuildMenu = proto._buildMenu;

        proto._buildMenu = function (window) {
            _origBuildMenu.call(this, window);

            for (const item of this._getMenuItems()) {
                const label = item.label;
                if (!label || typeof label.get_text !== 'function')
                    continue;

                const text = label.get_text();
                const key = SHORTCUT_MAP[text];
                if (!key)
                    continue;

                item[SHORTCUT_KEY] = key.charCodeAt(0);

                const idx = text.toLowerCase().indexOf(key);
                if (idx !== -1) {
                    const markupText = `${text.slice(0, idx)}<u>${text[idx]}</u>${text.slice(idx + 1)}`;
                    label.clutter_text.set_markup(markupText);
                }
            }

            if (this[HANDLER_ID])
                this.actor.disconnect(this[HANDLER_ID]);

            this[HANDLER_ID] = this.actor.connect('key-press-event', (actor, event) => {
                let state = event.get_state();
                state &= ~Clutter.ModifierType.LOCK_MASK;
                state &= ~Clutter.ModifierType.MOD2_MASK;
                if (state & Clutter.ModifierType.MODIFIER_MASK)
                    return Clutter.EVENT_PROPAGATE;

                const symbol = event.get_key_symbol();
                for (const item of this._getMenuItems()) {
                    if (item[SHORTCUT_KEY] && item[SHORTCUT_KEY] === symbol) {
                        item.activate(event);
                        return Clutter.EVENT_STOP;
                    }
                }
                return Clutter.EVENT_PROPAGATE;
            });
        };
    }

    disable() {
        if (_origBuildMenu) {
            WindowMenu.WindowMenu.prototype._buildMenu = _origBuildMenu;
            _origBuildMenu = null;
        }
    }
}
