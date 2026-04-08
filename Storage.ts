export class Storage<T> {
  private items: T[] = [];

  // Add item
  public addItem(item: T): void {
    this.items.push(item);
  }

  // Remove item
  public removeItem(item: T): void {
    this.items = this.items.filter(i => i !== item);
  }

  // Get all items
  public getAllItems(): T[] {
    return this.items;
  }
}