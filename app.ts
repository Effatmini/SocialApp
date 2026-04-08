import { User } from "./models/user";
import { Admin } from "./models/admin";

const user1 = new User(
  1,
  "Mustafa",
  "mustafa@gmail.com",
  "123456",
  "01000000000",
  25
);

user1.displayInfo();

console.log("------------");

const admin1 = new Admin(
  2,
  "Ahmed",
  "admin@gmail.com",
  "admin123",
  "01111111111",
  30
);

admin1.displayInfo();
admin1.manageUsers();