import Clutter from "gi://Clutter";
import Meta from "gi://Meta";
import { overview } from "resource:///org/gnome/shell/ui/main.js";

export default class MouseFollowFocus {
  constructor(mainExtension) {
    this.mainExtension = mainExtension;
    this.settings = mainExtension.settings;
    this.DEBUGGING = false;

    this.create_signal = null;
    this.hide_signal = null;
  }

  enable() {
    this._log("Enabling Mouse Follow Focus");

    // Initialize existing windows
    for (const actor of global.get_window_actors()) {
      if (actor.is_destroyed()) continue;
      this.connect_to_window(actor.get_meta_window());
    }

    // Connect to window creation signal
    this.create_signal = global.display.connect("window-created", (_, win) => {
      this._log(`Window created: ${win}`);
      this.connect_to_window(win);
    });

    // Handle overview hidden event
    this.hide_signal = overview.connect("hidden", () => {
      const win = this.get_focused_window();
      if (win !== null) {
        this.focus_changed(win);
      }
    });
  }

  disable() {
    this._log("Disabling Mouse Follow Focus");

    // Disconnect signals
    if (this.create_signal) {
      global.display.disconnect(this.create_signal);
      this.create_signal = null;
    }

    if (this.hide_signal) {
      overview.disconnect(this.hide_signal);
      this.hide_signal = null;
    }

    // Clean up window connections
    for (const actor of global.get_window_actors()) {
      if (actor.is_destroyed()) continue;
      const win = actor.get_meta_window();
      if (win._mousefollowsfocus_extension_signal) {
        win.disconnect(win._mousefollowsfocus_extension_signal);
        delete win._mousefollowsfocus_extension_signal;
      }
    }
  }

  // Helper methods
  get_window_actor(window) {
    return global
      .get_window_actors()
      .find(
        (actor) => !actor.is_destroyed() && actor.get_meta_window() === window,
      );
  }

  cursor_within_window(mouse_x, mouse_y, win) {
    const rect = win.get_buffer_rect();
    return (
      mouse_x >= rect.x &&
      mouse_x <= rect.x + rect.width &&
      mouse_y >= rect.y &&
      mouse_y <= rect.y + rect.height
    );
  }

  focus_changed(win) {
    const actor = this.get_window_actor(win);
    this._log("Window focus event received");

    if (!actor) return;

    const rect = win.get_buffer_rect();
    const [mouse_x, mouse_y] = global.get_pointer();

    if (this.cursor_within_window(mouse_x, mouse_y, win)) {
      this._log("Pointer within window, discarding event");
      return;
    }

    if (overview.visible) {
      this._log("Overview visible, discarding event");
      return;
    }

    if (rect.width < 10 && rect.height < 10) {
      this._log("Window too small, discarding event");
      return;
    }

    this._log("Targeting new window");
    const seat = Clutter.get_default_backend().get_default_seat();
    if (seat) {
      seat.warp_pointer(rect.x + rect.width / 2, rect.y + rect.height / 2);
    }
  }

  connect_to_window(win) {
    if (win.get_window_type() !== Meta.WindowType.NORMAL) {
      this._log(`Ignoring non-normal window type: ${win.get_window_type()}`);
      return;
    }

    if (!win._mousefollowsfocus_extension_signal) {
      win._mousefollowsfocus_extension_signal = win.connect(
        "focus",
        this.focus_changed.bind(this),
      );
    }
  }

  get_focused_window() {
    return global.display.focus_window;
  }

  _log(message) {
    if (this.DEBUGGING) {
      console.log("[Almost Perfection - Mouse Follow Focus]", message);
    }
  }
}
