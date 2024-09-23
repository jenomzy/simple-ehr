const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "patient" },
  medicalRecords: [
    { type: mongoose.Schema.Types.ObjectId, ref: "MedicalRecord" },
  ],
});

module.exports = mongoose.model("Patient", patientSchema);
