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
    const doctor = await Doctor.findOne({ email });
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
    const patient = await Patient.findOne({ email });
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
    // Fetch doctor-specific data here (e.g., patients, appointments)
    const doctor = await Doctor.findById(doctorId).populate("patients");

    res.render("doctor/dashboard", {
      title: "Doctor Dashboard",
      layout: "doctor",
      doctor,
    });
  } catch (error) {
    console.log("Error fetching doctor dashboard:", error);
    res.redirect("/");
  }
});

// Patient Dashboard Route
router.get(
  "/patient/dashboard",
  isAuthenticated,
  isPatient,
  async (req, res) => {
    try {
      const patientId = req.session.user.id;
      // Fetch patient-specific data here (e.g., medical records, appointments)
      const patient = await Patient.findById(patientId).populate(
        "medicalRecords"
      );

      res.render("patient/dashboard", {
        title: "Patient Dashboard",
        layout: "patient",
        patient,
      });
    } catch (error) {
      console.log("Error fetching patient dashboard:", error);
      res.redirect("/");
    }
  }
);

// Doctor - View All Patients
router.get("/doctor/patients", isAuthenticated, isDoctor, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.session.user.id).populate(
      "patients"
    );
    res.render("doctor/patients", {
      title: "Patients",
      layout: "doctor",
      patients: doctor.patients,
    });
  } catch (error) {
    console.log("Error fetching patients:", error);
    res.redirect("/doctor/dashboard");
  }
});

// Doctor - View All Patients
router.get(
  "/doctor/appointments",
  isAuthenticated,
  isDoctor,
  async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.session.user.id).populate(
        "patients"
      );
      res.render("doctor/patients", {
        title: "Appoinments",
        layout: "doctor",
        patients: doctor.patients,
      });
    } catch (error) {
      console.log("Error fetching patients:", error);
      res.redirect("/doctor/dashboard");
    }
  }
);

// Doctor - View Specific Patient Medical Records
router.get(
  "/doctor/patients/:id",
  isAuthenticated,
  isDoctor,
  async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id).populate(
        "medicalRecords"
      );
      res.render("doctor/patient-record", {
        title: "Patient Data",
        layout: "doctor",
        patient,
      });
    } catch (error) {
      console.log("Error fetching patient records:", error);
      res.redirect("/doctor/patients");
    }
  }
);

// Doctor - Add Medical Record (POST request)
router.post(
  "/doctor/patients/:id/record",
  isAuthenticated,
  isDoctor,
  async (req, res) => {
    try {
      const { diagnosis, prescription } = req.body;
      const newRecord = new MedicalRecord({
        diagnosis,
        prescription,
        doctor: req.session.user.id,
        patient: req.params.id,
      });

      await newRecord.save();

      // Update patient with new record
      const patient = await Patient.findById(req.params.id);
      patient.medicalRecords.push(newRecord);
      await patient.save();

      res.redirect(`/doctor/patients/${req.params.id}`);
    } catch (error) {
      console.log("Error adding medical record:", error);
      res.redirect(`/doctor/patients/${req.params.id}`);
    }
  }
);

// Patient - View All Medical Records
router.get("/patient/records", isAuthenticated, isPatient, async (req, res) => {
  try {
    const patientId = req.session.user.id;
    const patient = await Patient.findById(patientId).populate(
      "medicalRecords"
    );
    res.render("patient/records", {
      title: "Patient Records",
      layout: "patient",
      medicalRecords: patient.medicalRecords,
    });
  } catch (error) {
    console.log("Error fetching records:", error);
    res.redirect("/patient/dashboard");
  }
});

// Patient - Book Appointment (POST request)
router.post(
  "/patient/appointment/new",
  isAuthenticated,
  isPatient,
  async (req, res) => {
    try {
      const { doctorId, appointmentDate } = req.body;
      const newAppointment = new Appointment({
        doctor: doctorId,
        patient: req.session.user.id,
        date: new Date(appointmentDate),
      });

      await newAppointment.save();
      res.redirect("/patient/dashboard");
    } catch (error) {
      console.log("Error booking appointment:", error);
      res.redirect("/patient/appointment");
    }
  }
);

module.exports = router;
