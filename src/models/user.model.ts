import bcrypt from "bcryptjs";
import mongoose, { Schema, Document, UpdateQuery } from "mongoose";
import { encrypt, decrypt } from "../utils/crypto";

export type UserRole = "user" | "admin";
export type AuthProvider = "local" | "google";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  age?: number;
  profileImage?: string;
  coverImage?: string;
  role: UserRole;
  authProvider: AuthProvider;
  googleId?: string;
  picture?: string;
  isEmailConfirmed: boolean;
  emailConfirmationToken?: string;
  emailConfirmationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;
const encryptedValueRegex = /^[0-9a-f]+:[0-9a-f]+$/i;

const hashPasswordIfNeeded = async (password?: string) => {
  if (!password) {
    return password;
  }

  const looksHashed = password.startsWith("$2");
  return looksHashed ? password : bcrypt.hash(password, 10);
};

const encryptPhoneIfNeeded = (phone?: string) => {
  if (!phone || encryptedValueRegex.test(phone)) {
    return phone;
  }

  return encrypt(phone);
};

const normalizeSensitiveUpdateFields = async (
  update: UpdateQuery<IUser> | null | undefined
) => {
  if (!update) {
    return;
  }

  const directUpdate = update as UpdateQuery<IUser> & {
    $set?: Partial<IUser>;
  };
  const setUpdate = directUpdate.$set || {};

  const nextPassword =
    typeof setUpdate.password === "string"
      ? setUpdate.password
      : typeof directUpdate.password === "string"
        ? directUpdate.password
        : undefined;

  const nextPhone =
    typeof setUpdate.phone === "string"
      ? setUpdate.phone
      : typeof directUpdate.phone === "string"
        ? directUpdate.phone
        : undefined;

  if (nextPassword) {
    const hashedPassword = await hashPasswordIfNeeded(nextPassword);

    if (typeof setUpdate.password === "string") {
      setUpdate.password = hashedPassword;
    } else {
      directUpdate.password = hashedPassword;
    }
  }

  if (nextPhone) {
    const encryptedPhone = encryptPhoneIfNeeded(nextPhone);

    if (typeof setUpdate.phone === "string") {
      setUpdate.phone = encryptedPhone;
    } else {
      directUpdate.phone = encryptedPhone;
    }
  }

  if (Object.keys(setUpdate).length > 0) {
    directUpdate.$set = setUpdate;
  }
};

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [30, "Name must not exceed 30 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value: string) => emailRegex.test(value),
        message: "Please enter a valid email address"
      }
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.authProvider === "local";
      },
      minlength: [6, "Password must be at least 6 characters"],
      maxlength: [100, "Password must not exceed 100 characters"]
    },
    phone: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (value: string | undefined) =>
          !value ||
          phoneRegex.test(value) ||
          encryptedValueRegex.test(value),
        message: "Phone number must be 10 to 15 digits"
      }
    },
    age: {
      type: Number,
      required: false,
      min: [18, "Age must be at least 18"],
      max: [60, "Age must be 60 or less"],
      validate: {
        validator: (value: number | undefined) =>
          value === undefined || Number.isInteger(value),
        message: "Age must be a whole number"
      }
    },
    profileImage: {
      type: String
    },
    coverImage: {
      type: String
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    picture: {
      type: String
    },
    isEmailConfirmed: {
      type: Boolean,
      default: false
    },
    emailConfirmationToken: {
      type: String
    },
    emailConfirmationExpires: {
      type: Date
    },
    passwordResetToken: {
      type: String
    },
    passwordResetExpires: {
      type: Date
    },
    refreshToken: {
      type: String
    },
    refreshTokenExpiresAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const sanitizedRet = ret as Record<string, unknown>;

        if (typeof sanitizedRet.phone === "string") {
          sanitizedRet.phone = decrypt(sanitizedRet.phone);
        }

        delete sanitizedRet.password;
        delete sanitizedRet.emailConfirmationToken;
        delete sanitizedRet.emailConfirmationExpires;
        delete sanitizedRet.passwordResetToken;
        delete sanitizedRet.passwordResetExpires;
        delete sanitizedRet.refreshToken;
        delete sanitizedRet.refreshTokenExpiresAt;
        return sanitizedRet;
      }
    }
  }
);

userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await hashPasswordIfNeeded(this.password);
  }

  if (this.isModified("phone") && this.phone) {
    this.phone = encryptPhoneIfNeeded(this.phone);
  }
});

userSchema.pre("findOneAndUpdate", async function () {
  await normalizeSensitiveUpdateFields(this.getUpdate());
});

userSchema.pre("updateOne", async function () {
  await normalizeSensitiveUpdateFields(this.getUpdate());
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>("User", userSchema);

export default User;
