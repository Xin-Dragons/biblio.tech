import { without } from "lodash"
import { sleep } from "./utils"

export class Queue<T> {
  private _items: T[] = []
  private _active: boolean = false

  isActive() {
    return this._active
  }

  stop() {
    this._active = false
  }

  start() {
    this._active = true
  }

  async processQueue(operation: (item: T) => Promise<void>): Promise<void> {
    if (this._active) {
      return
    }

    this._active = true

    while (this._items.length && this._active) {
      const item = this.peek()
      if (item) {
        await operation(item)
      }
    }

    this._active = false
  }

  async processBatches(batchSize: number, operation: (items: T[]) => Promise<void>): Promise<void> {
    if (this._active) {
      return
    }

    this._active = true

    while (this._items.length && this._active) {
      const batch = this.take(batchSize)
      if (batch.length) {
        await operation(batch)
      }
    }

    this._active = false
  }

  removeFromQueue(condition: (item: T, index: number, items: T[]) => boolean): void {
    this._items = this._items.filter((item, index, items) => !condition(item, index, items))
  }

  prioritise(item: T): void {
    this._items.unshift(item)
  }

  prioritiseAll(items: T[]): void {
    this._items.unshift(...items)
  }

  enqueue(item: T): void {
    this._items.push(item)
  }

  enqueueAll(items: T[]): void {
    this._items.push(...items)
  }

  dequeue(): T | undefined {
    return this._items.shift()
  }

  dequeueAll(): T[] {
    return this._items.splice(0, this._items.length)
  }

  take(amount: number): T[] {
    return this._items.splice(0, amount)
  }

  peek(): T | undefined {
    return this._items[0]
  }

  peekAll(num: number): T[] {
    return this._items.slice(0, num)
  }

  isEmpty(): boolean {
    return this._items.length === 0
  }

  size(): number {
    return this._items.length
  }

  contains(condition: (item: T, index: number, items: T[]) => boolean): boolean {
    return !!this._items.find(condition)
  }
}
