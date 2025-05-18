import * as Main from "resource:///org/gnome/shell/ui/main.js";

const Urgency = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3,
};

const State = {
  HIDDEN: 0,
  SHOWING: 1,
  SHOWN: 2,
  HIDING: 3,
};

export default class FullScreenNotifications {
  constructor(mainExtension) {
    this.mainExtension = mainExtension;
    this.originalUpdateState = null;
  }

  _modifiedUpdateState() {
    let hasMonitor = Main.layoutManager.primaryMonitor != null;
    this.visible = !this._bannerBlocked && hasMonitor && this._banner != null;
    if (this._bannerBlocked || !hasMonitor) return;

    if (this._updatingState) return;

    this._updatingState = true;

    // Filter out acknowledged notifications
    let changed = false;
    this._notificationQueue = this._notificationQueue.filter((n) => {
      changed ||= n.acknowledged;
      return !n.acknowledged;
    });

    if (changed) this.emit("queue-changed");

    let hasNotifications = Main.sessionMode.hasNotifications;

    if (this._notificationState === State.HIDDEN) {
      let nextNotification = this._notificationQueue[0] || null;
      if (hasNotifications && nextNotification) {
        // Modified line: Remove fullscreen check
        let limited = this._busy;
        let showNextNotification =
          !limited ||
          nextNotification.forFeedback ||
          nextNotification.urgency === Urgency.CRITICAL;

        if (showNextNotification) this._showNotification();
      }
    } else if (
      this._notificationState === State.SHOWING ||
      this._notificationState === State.SHOWN
    ) {
      let expired =
        (this._userActiveWhileNotificationShown &&
          this._notificationTimeoutId === 0 &&
          this._notification.urgency !== Urgency.CRITICAL &&
          !this._banner.focused &&
          !this._pointerInNotification) ||
        this._notificationExpired;
      let mustClose = this._notificationRemoved || !hasNotifications || expired;

      if (mustClose) {
        let animate = hasNotifications && !this._notificationRemoved;
        this._hideNotification(animate);
      } else if (
        this._notificationState === State.SHOWN &&
        this._pointerInNotification
      ) {
        if (!this._banner.expanded) this._expandBanner(false);
        else this._ensureBannerFocused();
      }
    }

    this._updatingState = false;
    this._notificationExpired = false;
  }

  enable() {
    if (Main.messageTray && Main.messageTray._updateState) {
      this.originalUpdateState = Main.messageTray._updateState;
      Main.messageTray._updateState = this._modifiedUpdateState.bind(
        Main.messageTray,
      );
      console.log("[Almost Perfection] Enabled fullscreen notifications");
    }
  }

  disable() {
    if (Main.messageTray && this.originalUpdateState) {
      Main.messageTray._updateState = this.originalUpdateState;
      this.originalUpdateState = null;
      console.log("[Almost Perfection] Disabled fullscreen notifications");
    }
  }
}
