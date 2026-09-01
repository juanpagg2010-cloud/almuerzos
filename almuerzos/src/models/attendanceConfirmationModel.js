import { Schema, model } from "mongoose";

const attendanceConfirmationSchema = new Schema(
  {
    menuId: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },
    estudianteId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    asistira: {
      type: Boolean,
      required: [true, "Debes indicar si asistiras al almuerzo."],
    },
    observacion: {
      type: String,
      trim: true,
      maxlength: [300, "La observacion no puede superar 300 caracteres."],
      default: "",
    },
  },
  { timestamps: true, versionKey: false },
);

attendanceConfirmationSchema.index({ menuId: 1, estudianteId: 1 }, { unique: true });

export default model("AttendanceConfirmation", attendanceConfirmationSchema);
