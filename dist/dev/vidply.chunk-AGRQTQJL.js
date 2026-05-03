/*!
 * VidPly v1.1.12 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  i18n
} from "./vidply.chunk-SQ6JPO2C.js";

// src/utils/TimeUtils.ts
var TimeUtils = {
  formatTime(seconds, alwaysShowHours = false) {
    if (!isFinite(seconds) || seconds < 0) {
      return alwaysShowHours ? "00:00:00" : "00:00";
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (num) => String(num).padStart(2, "0");
    if (hours > 0 || alwaysShowHours) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  },
  parseTime(timeString) {
    const parts = timeString.split(":").map((p) => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  },
  formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) {
      return i18n.t("time.seconds", { count: 0 });
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hours > 0) {
      const key = hours === 1 ? "time.hour" : "time.hours";
      parts.push(i18n.t(key, { count: hours }));
    }
    if (minutes > 0) {
      const key = minutes === 1 ? "time.minute" : "time.minutes";
      parts.push(i18n.t(key, { count: minutes }));
    }
    if (secs > 0 || parts.length === 0) {
      const key = secs === 1 ? "time.second" : "time.seconds";
      parts.push(i18n.t(key, { count: secs }));
    }
    return parts.join(", ");
  },
  formatPercentage(value, total) {
    if (total === 0) return 0;
    return Math.round(value / total * 100);
  }
};

export {
  TimeUtils
};
//# sourceMappingURL=vidply.chunk-AGRQTQJL.js.map
