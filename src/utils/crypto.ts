import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET || "dev-encryption-secret";
const KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();

export const encrypt = (value: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (value: string) => {
  const [ivHex, encryptedHex] = value.split(":");

  if (!ivHex || !encryptedHex) {
    return value;
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(ivHex, "hex")
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
};
