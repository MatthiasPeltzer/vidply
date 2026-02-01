/**
 * EventEmitter Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from '../../src/utils/EventEmitter.js';

describe('EventEmitter', () => {
  let emitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('constructor', () => {
    it('should initialize with empty events object', () => {
      expect(emitter.events).toEqual({});
    });
  });

  describe('on', () => {
    it('should register an event listener', () => {
      const listener = vi.fn();
      emitter.on('test', listener);
      
      expect(emitter.events.test).toBeDefined();
      expect(emitter.events.test).toContain(listener);
    });

    it('should allow multiple listeners for the same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      emitter.on('test', listener1);
      emitter.on('test', listener2);
      
      expect(emitter.events.test).toHaveLength(2);
      expect(emitter.events.test).toContain(listener1);
      expect(emitter.events.test).toContain(listener2);
    });

    it('should return this for chaining', () => {
      const result = emitter.on('test', vi.fn());
      expect(result).toBe(emitter);
    });

    it('should allow chaining multiple on calls', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      emitter
        .on('event1', listener1)
        .on('event2', listener2);
      
      expect(emitter.events.event1).toContain(listener1);
      expect(emitter.events.event2).toContain(listener2);
    });
  });

  describe('once', () => {
    it('should register a listener that fires only once', () => {
      const listener = vi.fn();
      emitter.once('test', listener);
      
      emitter.emit('test');
      emitter.emit('test');
      emitter.emit('test');
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the once listener', () => {
      const listener = vi.fn();
      emitter.once('test', listener);
      
      emitter.emit('test', 'arg1', 'arg2');
      
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should return this for chaining', () => {
      const result = emitter.once('test', vi.fn());
      expect(result).toBe(emitter);
    });
  });

  describe('off', () => {
    it('should remove a specific listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      emitter.on('test', listener1);
      emitter.on('test', listener2);
      emitter.off('test', listener1);
      
      emitter.emit('test');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove all listeners for an event when no listener specified', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      emitter.on('test', listener1);
      emitter.on('test', listener2);
      emitter.off('test');
      
      emitter.emit('test');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(emitter.events.test).toBeUndefined();
    });

    it('should handle removing listener from non-existent event', () => {
      const result = emitter.off('nonexistent', vi.fn());
      expect(result).toBe(emitter);
    });

    it('should return this for chaining', () => {
      const listener = vi.fn();
      emitter.on('test', listener);
      const result = emitter.off('test', listener);
      expect(result).toBe(emitter);
    });
  });

  describe('emit', () => {
    it('should call all listeners for an event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      emitter.on('test', listener1);
      emitter.on('test', listener2);
      emitter.emit('test');
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should pass arguments to listeners', () => {
      const listener = vi.fn();
      emitter.on('test', listener);
      
      emitter.emit('test', 'arg1', 'arg2', 'arg3');
      
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should handle emitting non-existent event', () => {
      const result = emitter.emit('nonexistent');
      expect(result).toBe(emitter);
    });

    it('should return this for chaining', () => {
      const listener = vi.fn();
      emitter.on('test', listener);
      const result = emitter.emit('test');
      expect(result).toBe(emitter);
    });

    it('should call listeners in order of registration', () => {
      const order = [];
      emitter.on('test', () => order.push(1));
      emitter.on('test', () => order.push(2));
      emitter.on('test', () => order.push(3));
      
      emitter.emit('test');
      
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all event listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      emitter.on('event1', listener1);
      emitter.on('event2', listener2);
      emitter.removeAllListeners();
      
      emitter.emit('event1');
      emitter.emit('event2');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(emitter.events).toEqual({});
    });

    it('should return this for chaining', () => {
      const result = emitter.removeAllListeners();
      expect(result).toBe(emitter);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex event flow', () => {
      const results = [];
      
      emitter.on('start', () => results.push('started'));
      emitter.on('data', (data) => results.push(`data: ${data}`));
      emitter.once('complete', () => results.push('completed'));
      
      emitter.emit('start');
      emitter.emit('data', 'chunk1');
      emitter.emit('data', 'chunk2');
      emitter.emit('complete');
      emitter.emit('complete'); // Should not fire again
      
      expect(results).toEqual([
        'started',
        'data: chunk1',
        'data: chunk2',
        'completed'
      ]);
    });

    it('should allow listeners to remove themselves', () => {
      const callCount = { value: 0 };
      
      const selfRemovingListener = () => {
        callCount.value++;
        emitter.off('test', selfRemovingListener);
      };
      
      emitter.on('test', selfRemovingListener);
      emitter.emit('test');
      emitter.emit('test');
      
      expect(callCount.value).toBe(1);
    });
  });
});
