import nodemailer from "nodemailer";

export const sendOtpEmail = async (to: string, otp: string) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || smtpUser || "no-reply@example.com";

  const transporter =
    smtpHost && smtpPort && smtpUser && smtpPass
      ? nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        })
      : nodemailer.createTransport({
          jsonTransport: true
        });

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Your verification code",
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    html: `<p>Your OTP code is <strong>${otp}</strong>.</p><p>It will expire in 10 minutes.</p>`
  });

  return {
    preview:
      "message" in info
        ? String((info as { message: unknown }).message)
        : JSON.stringify({ messageId: info.messageId })
  };
};
