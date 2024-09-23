// Middleware to check if user is logged in
export function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// Middleware to check if user is a doctor
export function isDoctor(req, res, next) {
  if (req.session.user && req.session.user.role === "doctor") {
    return next();
  }
  res.redirect("/login");
}

// Middleware to check if user is a patient
export function isPatient(req, res, next) {
  if (req.session.user && req.session.user.role === "patient") {
    return next();
  }
  res.redirect("/login");
}
