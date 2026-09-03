import mongoose from "mongoose";
import dns from "node:dns";

// Algunos proveedores o redes bloquean las consultas SRV que requiere MongoDB Atlas.
// Estos resolutores permiten obtener los nodos del cluster sin depender del DNS local.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("Falta la variable MONGO_URI en el archivo .env.");
  }

  const connection = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB conectado en ${connection.connection.host}`);
};

export default connectDB;
