const express = require("express");
const bcrypt = require("bcryptjs");
const { isDoctor, isPatient, isAuthenticated } = require("../controllers/auth");

const router = express.Router();

// Load Models
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");

// Home Page Route
router.get("/", (req, res) => {
  if (req.session.user) {
    if (req.session.user.role === "doctor") {
      return res.redirect("/doctor/dashboard");
    } else if (req.session.user.role === "patient") {
      return res.redirect("/patient/dashboard");
    }
  }
  res.redirect("/login");
});

// Login Page Route
router.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

// Doctor Login
router.post("/login/doctor", async (req, res) => {
  const { email, password } = req.body;

  try {
    const doctor = await Doctor.findOne({ email : email.toUpperCase() });
    if (!doctor) {
      return res.redirect("/login"); // Doctor not found
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.redirect("/login"); // Invalid password
    }

    // Set user in session
    req.session.user = { id: doctor._id, role: "doctor" };
    res.redirect("/doctor/dashboard");
  } catch (err) {
    console.log("Error logging in doctor:", err);
    res.redirect("/login");
  }
});

// Patient Login
router.post("/login/patient", async (req, res) => {
  const { email, password } = req.body;

  try {
    const patient = await Patient.findOne({ email : email.toUpperCase() });
    if (!patient) {
      return res.redirect("/login");
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.redirect("/login"); // Invalid password
    }

    // Set user in session
    req.session.user = { id: patient._id, role: "patient" };
    res.redirect("/patient/dashboard");
  } catch (err) {
    console.log("Error logging in patient:", err);
    res.redirect("/login");
  }
});

// Logout Handler
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/");
    }
    res.redirect("/login");
  });
});

// Register Page Route
router.get("/register", (req, res) => {
  res.render("register", { title: "Registration" });
});

// Register Page Route
router.get("/doctor/register", isAuthenticated, isDoctor, (req, res) => {
  res.render("doctor/register", { title: "Registration", layout: "doctor" });
});

// Doctor Registration
router.post("/register/doctor", isAuthenticated, isDoctor, async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if doctor already exists
    let doctor = await Doctor.findOne({ email });
    if (doctor) {
      return res.redirect("/doctor/register"); // User already exists
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new doctor
    doctor = new Doctor({ name, email, password: hashedPassword });
    await doctor.save();

    res.redirect("/doctor/dashboard");
  } catch (err) {
    console.log("Error registering doctor:", err);
    res.redirect("/register");
  }
});

// Patient Registration
router.post("/register/patient", async (req, res) => {
  const { name, email, password, password2 } = req.body;

  try {
    // Check if patient already exists
    let patient = await Patient.findOne({ email });
    if (patient) {
      return res.redirect("/register"); // User already exists
    }

    if (password !== password2) return res.redirect("/register");

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new patient
    patient = new Patient({ name, email, password: hashedPassword });
    await patient.save();

    res.redirect("/login");
  } catch (err) {
    console.log("Error registering patient:", err);
    res.redirect("/register");
  }
});

// Doctor Dashboard Route
router.get("/doctor/dashboard", isAuthenticated, isDoctor, async (req, res) => {
  try {
    const doctorId = req.session.user.id;

    // Fetch doctor-specific data here
    const doctor = await Doctor.findById(doctorId)
      .populate({
        path: "patients",
        populate: {
          path: "medicalRecords",
          match: { doctor: doctorId }, // Only records associated with this doctor
          options: { sort: { date: -1 }, limit: 1 }, // Get the most recent record for each patient
        },
      })
      .lean();

    // Fetch appointment counts
    const approvedAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      status: "accepted",
    }).lean();
    const pendingAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      status: "pending",
    }).lean();

    res.render("doctor/dashboard", {
      title: "Doctor Dashboard",
      layout: "doctor",
      doctor: {
        doctor,
        approvedAppointments,
        pendingAppointments,
      },
    });
  } catch (error) {
    console.log("Error fetching doctor dashboard:", error);
    res.redirect("/");
  }
});

// GET - View All Patients for All Doctors
router.get("/doctor/patients", isAuthenticated, isDoctor, async (req, res) => {
  try {
    const patients = await Patient.find().populate("medicalRecords").lean();

    res.render("doctor/patients", {
      title: "Manage Patients",
      layout: "doctor",
      patients,
    });
  } catch (error) {
    console.log("Error fetching patients:", error);
    res.redirect("/doctor/dashboard");
  }
});

// GET - View specific patient details
router.get(
  "/doctor/patient/:id",
  isAuthenticated,
  isDoctor,
  async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id)
        .populate("medicalRecords")
        .populate({
          path: "medicalRecords",
          populate: { path: "doctor", select: "name" }, // To get doctor's name for records
        })
        .lean();

      const recentAppointment = await Appointment.findOne({
        patient: req.params.id,
        doctor: req.session.user.id,
      })
        .sort({ date: -1 })
        .lean();

      res.render("doctor/patient-details", {
        title: `Patient ${patient.name}`,
        layout: "doctor",
        patient,
        recentAppointment,
      });
    } catch (error) {
      console.log("Error fetching patient details:", error);
      res.redirect("/doctor/patients");
    }
  }
);

// POST - Add a new medical record for a patient
router.post(
  "/doctor/patient/:id/record",
  isAuthenticated,
  isDoctor,
  async (req, res) => {
    try {
      const { diagnosis, prescription } = req.body;

      const newRecord = await MedicalRecord.create({
        diagnosis,
        prescription,
        doctor: req.session.user.id,
        patient: req.params.id,
      });

      await Patient.findByIdAndUpdate(req.params.id, {
        $push: { medicalRecords: newRecord._id },
      });

      res.redirect(`/doctor/patient/${req.params.id}`);
    } catch (error) {
      console.log("Error adding medical record:", error);
      res.redirect(`/doctor/patient/${req.params.id}`);
    }
  }
);

// POST - Update an existing medical record
router.post(
  "/doctor/patient/:id/record/:recordId",
  isAuthenticated,
  isDoctor,
  async (req, res) => {
    try {
      const { diagnosis, prescription } = req.body;
      const recordId = req.params.recordId;

      await MedicalRecord.findByIdAndUpdate(recordId, {
        diagnosis,
        prescription,
      });

      res.redirect(`/doctor/patient/${req.params.id}`);
    } catch (error) {
      console.log("Error updating medical record:", error);
      res.redirect(`/doctor/patient/${req.params.id}`);
    }
  }
);

// Doctor - View All Patients
router.get(
  "/doctor/appointments",
  isAuthenticated,
  isDoctor,
  async (req, res) => {
    try {
      const doctorId = req.session.user.id;

      // Fetch all pending appointments
      const pendingAppointments = await Appointment.find({
        doctor: doctorId,
        status: "pending",
      })
        .populate("patient")
        .lean();

      // Fetch accepted appointments that are upcoming (date is in the future)
      const acceptedAppointments = await Appointment.find({
        doctor: doctorId,
        status: "accepted",
        date: { $gte: new Date() }, // only appointments that are still valid
      })
        .populate("patient")
        .lean();

      res.render("doctor/appointments", {
        title: "Doctor Appointments",
        layout: "doctor",
        pendingAppointments,
        acceptedAppointments,
      });
    } catch (error) {
      console.log("Error fetching appointments:", error);
      res.redirect("/doctor/dashboard");
    }
  }
);

// Approve Appointment
router.post(
  "/doctor/appointments/:id/approve",
  isAuthenticated,
  isDoctor,
  async (req, res) => {
    try {
      const appointmentId = req.params.id;

      // Update the status of the appointment to "accepted"
      await Appointment.findByIdAndUpdate(appointmentId, {
        status: "accepted",
      });

      res.redirect("/doctor/appointments");
    } catch (error) {
      console.log("Error approving appointment:", error);
      res.redirect("/doctor/appointments");
    }
  }
);

// Reject Appointment
router.post(
  "/doctor/appointments/:id/reject",
  isAuthenticated,
  isDoctor,
  async (req, res) => {
    try {
      const appointmentId = req.params.id;

      // Update the status of the appointment to "rejected"
      await Appointment.findByIdAndUpdate(appointmentId, {
        status: "rejected",
      });

      res.redirect("/doctor/appointments");
    } catch (error) {
      console.log("Error rejecting appointment:", error);
      res.redirect("/doctor/appointments");
    }
  }
);

// Patient Dashboard Route
router.get(
  "/patient/dashboard",
  isAuthenticated,
  isPatient,
  async (req, res) => {
    try {
      const patientId = req.session.user.id;

      // Find the patient, their current appointments (future), and last 3 medical records
      const patient = await Patient.findById(patientId)
        .populate({
          path: "medicalRecords",
          options: { limit: 3, sort: { date: -1 } }, // Last 3 medical records
        })
        .lean();

      // Find upcoming appointments (status 'accepted' or 'rejected', and not past the appointment date)
      const appointments = await Appointment.find({
        patient: patientId,
        date: { $gte: new Date() }, // Future dates only
        status: { $in: ["accepted", "rejected"] },
      })
        .populate("doctor")
        .lean();

      // Fetch the list of doctors
      const doctors = await Doctor.find().lean();

      res.render("patient/dashboard", {
        title: "Patient Dashboard",
        layout: "patient",
        patient,
        appointments,
        doctors,
      });
    } catch (error) {
      console.log("Error fetching patient dashboard:", error);
      res.redirect("/");
    }
  }
);

// Patient - Book Appointment (POST request)
router.post(
  "/patient/appointment/new",
  isAuthenticated,
  isPatient,
  async (req, res) => {
    try {
      const { doctorId, appointmentDate } = req.body;

      // Create a new appointment object
      const newAppointment = new Appointment({
        doctor: doctorId,
        patient: req.session.user.id,
        date: new Date(appointmentDate), // Converts the input to a Date object
      });

      // Save the new appointment
      await newAppointment.save();

      // Redirect back to the patient's dashboard after booking
      res.redirect("/patient/dashboard");
    } catch (error) {
      console.log("Error booking appointment:", error);
      res.redirect("/patient/dashboard"); // Redirect to dashboard in case of error
    }
  }
);

// Patient Medical Records Route
router.get("/patient/records", isAuthenticated, isPatient, async (req, res) => {
  try {
    const patientId = req.session.user.id;

    // Fetch all medical records for the patient
    const patient = await Patient.findById(patientId)
      .populate({
        path: "medicalRecords",
        options: { sort: { date: -1 } }, // Sort by most recent
        populate: { path: "doctor", select: "name" }, // To show doctor's name
      })
      .lean();

    res.render("patient/records", {
      title: "Medical Records",
      layout: "patient",
      patient,
    });
  } catch (error) {
    console.log("Error fetching medical records:", error);
    res.redirect("/patient/dashboard");
  }
});

module.exports = router;
