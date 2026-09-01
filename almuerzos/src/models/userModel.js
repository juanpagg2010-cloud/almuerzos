import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El correo es obligatorio."],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Ingresa un correo valido."],
    },
    password: {
      type: String,
      required: [true, "La contrasena es obligatoria."],
      minlength: [6, "La contrasena debe tener al menos 6 caracteres."],
      select: false,
    },
    grado: {
      type: Number,
      min: [1, "El grado debe estar entre 1 y 11."],
      max: [11, "El grado debe estar entre 1 y 11."],
      required: function isStudent() { return this.role === "Estudiante"; },
    },
    grupo: {
      type: Number,
      min: [1, "El grupo debe estar entre 1 y 8."],
      max: [8, "El grupo debe estar entre 1 y 8."],
      required: function isStudent() { return this.role === "Estudiante"; },
    },
    role: {
      type: String,
      enum: ["Admin", "Estudiante"],
      default: "Estudiante",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false },
);

export default model("User", userSchema);
