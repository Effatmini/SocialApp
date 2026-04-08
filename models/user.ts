import { NoteBook } from "./NoteBook";

export class User {
  public id: number;
  public name: string;
  public email: string;
  private password: string;
  protected phone: string;
  private _age!: number;

  private notebooks: NoteBook[] = [];

  constructor(
    id: number,
    name: string,
    email: string,
    password: string,
    phone: string,
    age: number
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.phone = phone;
    this.age = age;
  }

  get age(): number {
    return this._age;
  }

  set age(value: number) {
    if (value >= 18 && value <= 60) {
      this._age = value;
    } else {
      throw new Error("Age must be between 18 and 60");
    }
  }

  public addNotebook(notebook: NoteBook): void {
    this.notebooks.push(notebook);
  }

  public displayInfo(): void {
    console.log(`ID: ${this.id}`);
    console.log(`Name: ${this.name}`);
    console.log(`Email: ${this.email}`);
    console.log(`Phone: ${this.phone}`);
    console.log(`Age: ${this._age}`);
  }
}
