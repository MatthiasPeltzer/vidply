/**
 * Time formatting and conversion utilities
 */

export const TimeUtils = {
  /**
   * Format seconds to time string (HH:MM:SS or MM:SS)
   */
  formatTime(seconds, alwaysShowHours = false) {
    if (!isFinite(seconds) || seconds < 0) {
      return alwaysShowHours ? '00:00:00' : '00:00';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const pad = (num) => String(num).padStart(2, '0');
    
    if (hours > 0 || alwaysShowHours) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    
    return `${pad(minutes)}:${pad(secs)}`;
  },

  /**
   * Parse time string to seconds
   */
  parseTime(timeString) {
    const parts = timeString.split(':').map(p => parseInt(p, 10));
    
    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // SS
      return parts[0];
    }
    
    return 0;
  },

  /**
   * Format seconds to readable duration
   */
  formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) {
      return '0 seconds';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    
    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }
    if (secs > 0 || parts.length === 0) {
      parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  },

  /**
   * Format percentage
   */
  formatPercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }
};

