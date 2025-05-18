import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import Adw from "gi://Adw";
import Gio from "gi://Gio";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class AlmostPerfectionPreferences extends ExtensionPreferences {
  constructor(metadata) {
    super(metadata);
  }

  getPreferencesWidget() {
    const settings = this.getSettings();

    const prefsWidget = new Adw.PreferencesPage({
      title: "Features",
      icon_name: "dialog-information-symbolic",
      margin_top: 20,
      margin_bottom: 20,
      margin_start: 20,
      margin_end: 20,
    });

    const group = new Adw.PreferencesGroup({
      title: "Enabled Features",
      description: "Toggle individual components of the extension",
    });

    const createSwitch = (title, subtitle, key) => {
      const row = new Adw.ActionRow({ title, subtitle });
      const toggle = new Gtk.Switch({
        active: settings.get_boolean(key),
        valign: Gtk.Align.CENTER,
      });
      settings.bind(key, toggle, "active", Gio.SettingsBindFlags.DEFAULT);
      row.add_suffix(toggle);
      row.activatable_widget = toggle;
      return row;
    };

    // Create switches
    const powerNotifRow = createSwitch(
      "Power Profile Notifications",
      "Show notifications when power profile changes",
      "power-profile-notifier",
    );

    const powerIndicatorRow = createSwitch(
      "Power Profile Indicator",
      "Display power profile icon in top panel",
      "power-profile-indicator",
    );

    const showBalancedRow = createSwitch(
      "Show Balanced Profile",
      "Display indicator even in balanced mode",
      "power-profile-indicator-show-balanced",
    );

    const fullscreenNotifRow = createSwitch(
      "Full Screen Notifications",
      "Allow notifications in fullscreen mode",
      "full-screen-notifications",
    );

    const mouseFollowRow = createSwitch(
      "Mouse Follow Focus",
      "Move mouse to focused window",
      "mouse-follow-focus",
    );

    // Add rows to group
    group.add(powerNotifRow);
    group.add(powerIndicatorRow);
    group.add(showBalancedRow);
    group.add(fullscreenNotifRow);
    group.add(mouseFollowRow);

    // Get switch widgets
    const powerIndicatorSwitch = powerIndicatorRow.get_last_child();
    const showBalancedSwitch = showBalancedRow.get_last_child();

    // Bind showBalanced sensitivity to powerIndicator state
    const updateSensitivity = () => {
      const isActive = settings.get_boolean("power-profile-indicator");
      showBalancedSwitch.sensitive = isActive;
    };

    // Initial update
    updateSensitivity();

    // Connect to settings changes instead of widget properties
    settings.connect("changed::power-profile-indicator", updateSensitivity);

    prefsWidget.add(group);
    return prefsWidget;
  }

  fillPreferencesWindow(window) {
    const widget = this.getPreferencesWidget();
    window.add(widget);
  }
}
