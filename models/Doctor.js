const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "doctor" },
  designation: {
    type: String,
    enums: ["consultant", "radiologist", "pharmacist", "lab"],
  },
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: "Patient" }],
});

module.exports = mongoose.model("Doctor", doctorSchema);
