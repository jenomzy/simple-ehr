const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema({
  diagnosis: { type: String, required: true },
  prescription: { type: String },
  lab: { type: String },
  radio: { type: String },
  pharm: { type: String, default: "no" },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
