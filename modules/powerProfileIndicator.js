import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { SystemIndicator } from "resource:///org/gnome/shell/ui/quickSettings.js";

const PowerProfileIndicatorModule = GObject.registerClass(
  class PowerProfileIndicator extends SystemIndicator {
    _init(settings) {
      super._init();
      this._settings = settings;

      // Create indicator immediately
      this._indicator = this._addIndicator();
      this._container = this._indicator.get_parent();

      // Initialize visibility state
      this._indicator.visible = false;

      this._settings.connectObject(
        "changed::power-profile-indicator-show-balanced",
        this._updateIndicator.bind(this),
        this,
      );

      this._timeout = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        this._powerProfileToggle =
          Main.panel.statusArea.quickSettings?._powerProfiles?.quickSettingsItems[0];

        if (this._powerProfileToggle) {
          // Connect to both the toggle and its proxy
          this._powerProfileToggle.connectObject(
            "notify::icon-name",
            this._updateIndicator.bind(this),
            this,
          );

          this._powerProfileToggle._proxy.connect(
            "g-properties-changed",
            this._onProxyChange.bind(this),
          );

          this._updateIndicator();
        }

        this.connectObject(
          "scroll-event",
          (actor, event) => this._onScrollEvent(event),
          this,
        );

        this._timeout = null;
        return GLib.SOURCE_REMOVE;
      });
    }

    _onProxyChange(proxy, changed) {
      const keys = changed.deep_unpack();
      if ("ActiveProfile" in keys) {
        this._updateIndicator();
      }
    }

    _updateIndicator() {
      if (!this._powerProfileToggle) return;

      const currentProfile = this._powerProfileToggle._proxy.ActiveProfile;
      const showBalanced = this._settings.get_boolean(
        "power-profile-indicator-show-balanced",
      );
      const shouldShow = currentProfile !== "balanced" || showBalanced;

      // Update icon regardless of visibility
      this._indicator.icon_name = this._powerProfileToggle.icon_name;

      if (shouldShow) {
        if (!this._indicator.get_parent()) {
          this._container.add_child(this._indicator);
        }
        this._indicator.visible = true;
      } else {
        this._indicator.visible = false;
        if (this._indicator.get_parent()) {
          this._container.remove_child(this._indicator);
        }
      }
    }

    _onScrollEvent(event) {
      if (!this._powerProfileToggle) return Clutter.EVENT_PROPAGATE;

      const proxy = this._powerProfileToggle._proxy;
      const profiles = proxy.Profiles.map((p) => p.Profile.unpack()).reverse();
      const currentIndex = profiles.indexOf(proxy.ActiveProfile);

      if (currentIndex === -1) return Clutter.EVENT_PROPAGATE;

      let newIndex = currentIndex;
      switch (event.get_scroll_direction()) {
        case Clutter.ScrollDirection.UP:
          newIndex = Math.max(currentIndex - 1, 0);
          break;
        case Clutter.ScrollDirection.DOWN:
          newIndex = Math.min(currentIndex + 1, profiles.length - 1);
          break;
        default:
          return Clutter.EVENT_PROPAGATE;
      }

      proxy.ActiveProfile = profiles[newIndex];
      return Clutter.EVENT_STOP;
    }

    destroy() {
      if (this._timeout) {
        GLib.Source.remove(this._timeout);
        this._timeout = null;
      }
      if (this._powerProfileToggle) {
        this._powerProfileToggle.disconnectObject(this);
        this._powerProfileToggle._proxy.disconnectObject(this);
        this._powerProfileToggle = null;
      }
      if (this._indicator) {
        this._indicator.destroy();
        this._indicator = null;
      }
      super.destroy();
    }
  },
);

export default class PowerProfileIndicator {
  constructor(mainExtension) {
    this.mainExtension = mainExtension;
    this._indicator = null;
  }

  enable() {
    this._indicator = new PowerProfileIndicatorModule(this.mainExtension.settings);
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    this._indicator?.destroy();
    this._indicator = null;
  }
}
