const express = require("express");
const { engine } = require("express-handlebars");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

// Mongodb(database) connection
//mongoose.connect('mongodb://localhost:27017/simple-ehr').then(() => console.log('MongoDB connected')).catch(err => console.log(err));
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Handlebars middleware
app.engine(".hbs", engine({ extname: ".hbs" }));
app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "views"));

//Body Parser middleware
app.use(express.urlencoded({ extended: false }));

//Session management
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: true,
    saveUninitialized: true,
  })
);

// Connect flash
app.use(flash());

// Flash variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

// Static folder
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", require("./routes/index"));

app.listen(PORT, console.log("Server running on port", PORT));
