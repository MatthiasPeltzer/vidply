/**
 * Simple EventEmitter implementation
 */

export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  once(event, listener) {
    const onceListener = (...args) => {
      listener(...args);
      this.off(event, onceListener);
    };
    return this.on(event, onceListener);
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    
    if (!listener) {
      delete this.events[event];
    } else {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
    
    return this;
  }

  emit(event, ...args) {
    if (!this.events[event]) return this;
    
    this.events[event].forEach(listener => {
      listener(...args);
    });
    
    return this;
  }

  removeAllListeners() {
    this.events = {};
    return this;
  }
}

