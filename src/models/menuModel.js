import { Schema, model } from "mongoose";

const menuSchema = new Schema(
  {
    fecha: {
      type: Date,
      default: Date.now,
      index: true,
    },
    platoPrincipal: {
      type: String,
      required: [true, "El plato principal es obligatorio."],
      trim: true,
    },
    acompanamiento: {
      type: String,
      trim: true,
      default: "",
    },
    bebida: {
      type: String,
      trim: true,
      default: "",
    },
    imagenes: {
      type: [String],
      default: [],
    },
    descripcion: {
      type: String,
      trim: true,
      default: "",
    },
    estado: {
      type: String,
      enum: ["Borrador", "Publicado", "Cerrado"],
      default: "Borrador",
    },
    diaSemana: {
      type: String,
      enum: ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
      default: "",
    },
    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

export default model("Menu", menuSchema);
