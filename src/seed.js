import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import connectDB from "./config/db.js";
import User from "./models/userModel.js";

dotenv.config();

const getAdminData = () => {
  const admin = {
    name: process.env.SEED_ADMIN_NAME || "Administrador de almuerzos",
    email: String(process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase(),
    password: process.env.SEED_ADMIN_PASSWORD || "",
  };

  if (!admin.email || !admin.password) {
    throw new Error("Configura SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en el archivo .env.");
  }

  if (admin.password.length < 6) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 6 caracteres.");
  }

  return admin;
};

const seedAdmin = async () => {
  const admin = getAdminData();
  await connectDB();

  const user = await User.findOneAndUpdate(
    { email: admin.email },
    {
      name: admin.name,
      email: admin.email,
      password: await bcrypt.hash(admin.password, 12),
      role: "Admin",
      isActive: true,
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  console.log(`Administrador listo: ${user.email}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedAdmin()
    .catch((error) => {
      console.error(`No se pudo crear el administrador: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.connection.close();
    });
}

export default seedAdmin;
