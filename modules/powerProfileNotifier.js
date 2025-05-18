import Gio from "gi://Gio";
import GLib from "gi://GLib";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

export default class PowerProfileNotifier {
  constructor(mainExtension) {
    this.mainExtension = mainExtension;
    this._signalId = null;
  }

  enable() {
    this._signalId = Gio.DBus.system.signal_subscribe(
      "net.hadess.PowerProfiles",
      "org.freedesktop.DBus.Properties",
      "PropertiesChanged",
      "/net/hadess/PowerProfiles",
      null,
      Gio.DBusSignalFlags.NONE,
      this._onPropertiesChanged.bind(this),
    );
  }

  disable() {
    if (this._signalId !== null) {
      Gio.DBus.system.signal_unsubscribe(this._signalId);
      this._signalId = null;
    }
  }

  _onPropertiesChanged(
    connection,
    sender,
    objectPath,
    interfaceName,
    signalName,
    parameters,
  ) {
    let [iface, changedProps, _invalidatedProps] = parameters.deep_unpack();

    if (iface !== "net.hadess.PowerProfiles") return;

    if ("ActiveProfile" in changedProps) {
      let profile = changedProps["ActiveProfile"].deep_unpack();
      log(`[PowerProfileExtension] Power profile changed to: ${profile}`);

      const prettyLabel = this._formatProfileLabel(profile);
      const iconName = this._getIconForProfile(profile);
      const icon = Gio.Icon.new_for_string(iconName);

      Main.osdWindowManager.show(-1, icon, prettyLabel, null, null);
    }
  }

  _formatProfileLabel(profile) {
    switch (profile) {
      case "power-saver":
        return "Power Saver";
      case "balanced":
        return "Balanced";
      case "performance":
        return "Performance";
      default:
        return profile;
    }
  }

  _getIconForProfile(profile) {
    switch (profile) {
      case "power-saver":
        return "power-profile-power-saver-symbolic";
      case "balanced":
        return "power-profile-balanced-symbolic";
      case "performance":
        return "power-profile-performance-symbolic";
      default:
        return "battery-symbolic";
    }
  }
}
