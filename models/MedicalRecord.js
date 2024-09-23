const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema({
  diagnosis: { type: String, required: true },
  prescription: { type: String, required: true },
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
