import Gio from "gi://Gio";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import PowerProfileNotifier from "./modules/powerProfileNotifier.js";
import MouseFollowFocus from "./modules/mouseFollowFocus.js";
import FullScreenNotifications from "./modules/fullScreenNotifications.js";
import PowerProfileIndicator from "./modules/powerProfileIndicator.js";

export default class AlmostPerfectionExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this.modules = new Map();
    this.settings = null;
  }

  enable() {
    this.settings = this.getSettings();

    // Initialize all modules
    this._initializeModule("power-profile-notifier", PowerProfileNotifier);
    this._initializeModule("power-profile-indicator", PowerProfileIndicator);
    this._initializeModule(
      "full-screen-notifications",
      FullScreenNotifications,
    );
    this._initializeModule("mouse-follow-focus", MouseFollowFocus);

    // Connect settings changes
    this.settings.connect("changed", this._onSettingsChanged.bind(this));
  }

  disable() {
    // Disable all active modules
    this.modules.forEach((module, key) => {
      if (module.instance) {
        module.instance.disable();
        module.instance = null;
      }
    });

    this.settings = null;
  }

  _initializeModule(key, ModuleClass) {
    const enabled = this.settings.get_boolean(key);
    const module = {
      Class: ModuleClass,
      instance: null,
    };

    if (enabled) {
      module.instance = new ModuleClass(this);
      module.instance.enable();
    }

    this.modules.set(key, module);
  }

  _onSettingsChanged(settings, key) {
    const module = this.modules.get(key);
    if (!module) return;

    const enabled = settings.get_boolean(key);

    if (enabled && !module.instance) {
      module.instance = new module.Class(this);
      module.instance.enable();
    } else if (!enabled && module.instance) {
      module.instance.disable();
      module.instance = null;
    }
  }
}
