const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
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
  date: { type: Date, required: true },
  status: { type: String, default: "pending" }, // can be 'accepted', 'rejected', 'pending'
});

module.exports = mongoose.model("Appointment", appointmentSchema);
