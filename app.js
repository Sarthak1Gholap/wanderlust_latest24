if (process.env.NODE_ENV != "production") {
  require('dotenv').config();
  console.log(process.env.CLOUD_NAME);
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const MongoStore = require("connect-mongo");

const dbUrl = process.env.ATLASDB_URL;

const register = async (user, password) => {
  let newUser = new User(user);
  await User.register(newUser, password);
  return {
      user: newUser,
      message: "User registered successfully",
  };
};

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
      secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
  store,
  secret: "superscerettesting",
  resave: false,
  saveUninitialized: true,
  cookie: {
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
  },
};

app.use(session(sessionOptions));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.get("/demouser", async (req, res) => {
  let fakeUser = new User({
      email: "student@gmail.com",
      username: "delta-student",
  });
  const registeredUser = await register(fakeUser, "helloworld");
  res.send(registeredUser);
});

const listingRoutes = require("./routes/listings");
const reviewRoutes = require("./routes/reviews");
const userRoutes = require("./routes/user");

async function main() {
  await mongoose.connect(dbUrl);
}

main().then(() => {
  console.log("Connected to DB");
}).catch((err) => {
  console.log(err);
});

// app.get("/", (req, res) => {
//     res.send("Hi, I am root");
// });

app.use("/listings", listingRoutes);
app.use("/listings/:id/reviews", reviewRoutes);
app.use("/", userRoutes);

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
  console.log(err);
  const { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message });
  // res.status(statusCode).send(message);
});

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
