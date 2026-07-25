import { Schema, model } from "mongoose";

const menuSchema = new Schema(
  {
    fecha: {
      type: Date,
      required: [true, "La fecha del menu es obligatoria."],
      unique: true,
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
    postre: {
      type: String,
      trim: true,
      default: "",
    },
    descripcion: {
      type: String,
      trim: true,
      default: "",
    },
    estado: {
      type: String,
      enum: ["Publicado", "Cerrado"],
      default: "Publicado",
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
