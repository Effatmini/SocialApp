import { User } from "./user";

export class Admin extends User {
  public role: string;

  constructor(
    id: number,
    name: string,
    email: string,
    password: string,
    phone: string,
    age: number,
    role: string = "Admin"
  ) {
    super(id, name, email, password, phone, age);
    this.role = role;
  }

  public manageUsers(): void {
    console.log(`${this.name} is managing users`);
  }

  public displayInfo(): void {
    super.displayInfo();
    console.log(`Role: ${this.role}`);
  }
}