require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const session = require("express-session");
const nodemailer = require("nodemailer");
app.use(express.urlencoded({ extended: true }));
const Theatre = require("./models/theatre.js");
const Screen = require("./models/screens.js");
const Show = require("./models/shows.js");
const User = require("./models/user.js");
const Review = require("./models/review.js");
const Booking = require("./models/booking.js");
const Movie = require("./models/movie.js");
const joi = require("joi");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const mongoUrl = process.env.MONGO_URL;
const cors = require("cors");
const http = require("http");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const MongoStore = require("connect-mongo");


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

async function verifyRazorpayPayment(
  expectedAmount,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
) {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new Error("Invalid payment signature.");
  }

  const payment = await razorpay.payments.fetch(razorpay_payment_id);
  if (!payment) {
    throw new Error("Payment not found.");
  }

  if (payment.status !== "captured") {
    throw new Error("Payment not captured.");
  }

  if (payment.amount !== expectedAmount) {
    throw new Error("Payment amount mismatch.");
  }

  const alreadyUsed = await Booking.findOne({ paymentId: razorpay_payment_id });
  if (alreadyUsed) {
    throw new Error("Payment already used.");
  }

  return payment;
}

class expressError extends Error {
  constructor(status, message) {
    super();
    this.status = status;
    this.message = message;
  }
}

const wrapAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      next(err);
    });
  };
};

const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

async function main() {
  await mongoose.connect(mongoUrl);
}
main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

const sessionOptions = {
  secret: "mysecretkey",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none"
  },
};



let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "tickt.booking@gmail.com",
    pass: process.env.PASSWORD,
  },
});

const sendVerificationCode = async (email, verificationCode) => {
  const info = await transporter.sendMail({
    from: "ticktbooking@gmail.com",
    to: email,
    subject: "Hello",
    text: `${verificationCode}`, // plain‑text body
  });

  console.log("Message sent:", info.messageId);
};

app.set("trust proxy", 1);
app.use(session(sessionOptions));
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

function getISTDayRangeFromFormattedDate(dateStr, year) {
  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  // Split "Thu, Jul 10" => ["Thu", "Jul", "10"]
  const [, monthStr, dayStr] = dateStr.split(/[\s,]+/);
  const monthIndex = monthMap[monthStr];
  const day = parseInt(dayStr, 10);

  // Adjust for IST
  const startUTC = new Date(Date.UTC(year, monthIndex, day, -5, -30));
  const endUTC = new Date(Date.UTC(year, monthIndex, day + 1, -5, -30));

  return {
    startUnix: Math.floor(startUTC.getTime() / 1000),
    endUnix: Math.floor(endUTC.getTime() / 1000) - 1,
  };
}

function convertToUnix(showDate, showTime) {
  // Combine date and time into ISO-like string
  const dateTimeStr = `${showDate}T${showTime}:00`; // Adds seconds

  // Create Date object
  const date = new Date(dateTimeStr);

  // Get Unix timestamp in seconds
  return Math.floor(date.getTime() / 1000);
}

const shows = {};

async function loadShow(showId) {
  const show = await Show.findById(showId);
  shows[showId] = {
    bookedSeats: show.bookedSeats,
    locks: {},
    userLocks: {},
  };
  return shows[showId];
}

setInterval(() => {
  const now = Date.now();
  for (const showId in shows) {
    const show = shows[showId];
    for (const seat in show.locks) {
      if (show.locks[seat].expiresAt < now) {
        const locker = show.locks[seat].locker;
        show.userLocks[locker] = show.userLocks[locker].filter(
          (s) => s !== +seat
        );
        delete show.locks[seat];
      }
    }
  }
}, 60000);

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  throw new expressError(401, "You must be logged in to do that");
};

const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  throw new expressError(403, "You must be an admin to do that");
};
const verificationSchema = joi.object({
  verificationCode: joi.number().required(),
  email: joi.string().required(),
});
const userSchema = joi.object({
  name: joi.string().required(),
  email: joi.string().email().required(),
  username: joi.string().required(),
  password: joi.string().required(),
});

io.on("connection", (socket) => {
  socket.on("joinShow", async (showId) => {
    try {
      socket.join(showId);
      let show = shows[showId];
      if (!show) {
        show = await loadShow(showId);
      }
      console.log(show);
      socket.emit("seatData", { bookedSeats: show.bookedSeats });
    } catch (err) {
      console.log(err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("lockSeat", ({ showId, seatNumber }) => {
    try {
      const locker = socket.id;
      const show = shows[showId];

      if (show.bookedSeats.includes(seatNumber)) {
        return socket.emit("lockFailed", "seat is already booked");
      }

      if (show.locks[seatNumber]) {
        return socket.emit("lockFailed", "seat is held by someone");
      }

      if (!show.userLocks[locker]) {
        show.userLocks[locker] = [];
      }

      if (show.userLocks[locker].length >= 5) {
        return socket.emit("lockFailed", "max 5 seats can be locked at a time");
      }

      show.locks[seatNumber] = {
        locker,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      show.userLocks[locker].push(seatNumber);
      socket.emit("lockSuccess", seatNumber);
    } catch (err) {
      console.log(err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("unlockSeat", ({ showId, seatNumber }) => {
    try {
      const locker = socket.id;
      const show = shows[showId];

      if (show.locks[seatNumber].locker === locker) {
        delete show.locks[seatNumber];
        show.userLocks[locker] = show.userLocks[locker].filter(
          (s) => s !== seatNumber
        );
      }
    } catch (err) {
      console.log(err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on(
    "confirmSeats",
    async ({
      showId,
      seatNumbers,
      userId,
      amount,
      paymentId,
      orderId,
      signature,
    }) => {
      console.log(amount);
      try {
        const locker = socket.id;
        const show = shows[showId];
        const heldSeats = show.userLocks[locker] || [];
        if (!seatNumbers.every((s) => heldSeats.includes(s))) {
          return socket.emit("confirmFailed", "seats are not locked by you");
        }

        const payment = await verifyRazorpayPayment(
          amount,
          orderId,
          paymentId,
          signature
        );
        if (!payment) {
          return socket.emit("confirmFailed", "Payment verification failed");
        }

        seatNumbers.forEach((seat) => {
          show.bookedSeats.push(seat);
          delete show.locks[seat];
        });
        show.userLocks[locker] = [];

        let currShow = await Show.findById(showId)
          .populate("screen")
          .populate("movie")
          .populate("theatre");
        currShow.bookedSeats = [...currShow.bookedSeats, ...seatNumbers];
        await currShow.save();
        let newBooking = new Booking({
          show: showId,
          user: userId,
          seats: seatNumbers,
          time: Math.floor(Date.now() / 1000),
          paymentId: paymentId,
        });
        await newBooking.save();

        io.to(showId).emit("seatsBooked", seatNumbers);
        socket.emit("bookingConfirmed", {
          bookingId: newBooking._id,
          showDetails: currShow,
          seat: seatNumbers,
        });
      } catch (err) {
        console.log(err);
        socket.emit("error", { message: err.message });
      }
    }
  );

  socket.on("cancelSeats", async ({ seats, booking }) => {
    try {
      const currShow = await Show.findById(booking.show._id);
      if (!currShow) return;

      const updatedBookedSeats = currShow.bookedSeats.filter(
        (seat) => !seats.includes(seat)
      );
      currShow.bookedSeats = updatedBookedSeats;
      await currShow.save();

      const currBooking = await Booking.findById(booking._id);
      if (currBooking) {
        if (currBooking.seats.length === seats.length) {
          await Booking.findByIdAndDelete(booking._id);
        } else {
          currBooking.seats = currBooking.seats.filter(
            (seat) => !seats.includes(seat)
          );
          await currBooking.save();
        }
      }

      if (shows[booking.show._id]) {
        shows[booking.show._id].bookedSeats = updatedBookedSeats;
      }

      io.to(booking.show._id).emit("seatsCancelled", seats);
      const newBookings = await Booking.find({ user: booking.user }).populate({
        path: "show",
        populate: { path: "theatre" },
      });
      socket.emit("bookingSeatsCancelled", newBookings.reverse());
    } catch (err) {
      console.log(err);
      socket.emit("error", { message: err.message });
    }
  });
});

app.post("/api/create-order", async (req, res) => {
  const { amount } = req.body;
  try {
    const options = {
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create order", error: err.message });
  }
});

app.get(
  "/api/movies",
  wrapAsync(async (req, res) => {
    const movies = await Movie.find(
      {},
      "_id title poster genres year ratings length"
    );
    res.json(movies);
  })
);

// { title, poster, ratings, genres, length }

app.get(
  "/api/movies/upcoming",
  wrapAsync(async (req, res) => {
    const currentDate = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'

    const movies = await Movie.find(
      { releaseDate: { $gt: currentDate } },
      "title poster ratings genres length"
    );

    res.json(movies);
  })
);

app.get(
  "/api/movies/:city/nowplaying",
  wrapAsync(async (req, res) => {
    const currentUnix = Math.floor(Date.now() / 1000); // current UNIX time
    const today = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'
    const targetCity = req.params.city; // <-- change as needed

    const movies = await Show.aggregate([
      // Lookup theatre to check city
      {
        $lookup: {
          from: "theatres",
          localField: "theatre",
          foreignField: "_id",
          as: "theatreDetails",
        },
      },
      { $unwind: "$theatreDetails" },

      // Filter by theatre city
      {
        $match: {
          "theatreDetails.city": targetCity,
        },
      },

      // Filter shows by startTime > now
      {
        $match: {
          startTime: { $gt: currentUnix },
        },
      },

      // Lookup movie details
      {
        $lookup: {
          from: "movies",
          localField: "movie",
          foreignField: "_id",
          as: "movieDetails",
        },
      },
      { $unwind: "$movieDetails" },

      // Filter movie by releaseDate < today
      {
        $match: {
          "movieDetails.releaseDate": { $lte: today },
        },
      },

      // Group by movie to make them unique
      {
        $group: {
          _id: "$movie",
          show: { $first: "$$ROOT" },
        },
      },

      // Replace root to flatten the document
      {
        $replaceRoot: { newRoot: "$show" },
      },

      // Project only the fields you want
      {
        $project: {
          _id: "$movieDetails._id",
          title: "$movieDetails.title",
          poster: "$movieDetails.poster",
          genres: "$movieDetails.genres",
          ratings: "$movieDetails.ratings",
          length: "$movieDetails.length",
          trailer: "$movieDetails.trailer",
        },
      },
    ]);

    res.json(movies);
  })
);

app.get(
  "/api/movies/:city/popular",
  wrapAsync(async (req, res) => {
    const city = req.params.city;
    const currentUnix = Math.floor(Date.now() / 1000);
    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];
    const tenDaysAgo = new Date(todayDate.getTime() - 10 * 24 * 60 * 60 * 1000);
    const startDate = tenDaysAgo.toISOString().split("T")[0];

    const popular = await Show.aggregate([
      {
        $lookup: {
          from: "movies",
          localField: "movie",
          foreignField: "_id",
          as: "movieDetails",
        },
      },
      { $unwind: "$movieDetails" },

      {
        $lookup: {
          from: "theatres",
          localField: "theatre",
          foreignField: "_id",
          as: "theatreDetails",
        },
      },
      { $unwind: "$theatreDetails" },

      {
        $match: {
          "theatreDetails.city": city,
          startTime: { $gte: currentUnix },
          "movieDetails.releaseDate": { $lte: today },

          $or: [
            { "movieDetails.ratings.imdbRating": { $gte: 7 } },
            { "movieDetails.popularity": { $gte: 300 } },
          ],
        },
      },

      {
        $group: {
          _id: "$movie",
          popularShow: { $first: "$$ROOT" },
        },
      },

      { $replaceRoot: { newRoot: "$popularShow" } },

      {
        $lookup: {
          from: "movies",
          localField: "movie",
          foreignField: "_id",
          as: "movie",
        },
      },
      { $unwind: "$movie" },
      {
        $project: {
          _id: "$movieDetails._id",
          title: "$movieDetails.title",
          poster: "$movieDetails.poster",
          genres: "$movieDetails.genres",
          ratings: "$movieDetails.ratings",
          length: "$movieDetails.length",
          bgImage: "$movieDetails.bgImage",
        },
      },
    ]);

    res.json(popular);
  })
);

app.get(
  "/api/movies/:city/toprated",
  wrapAsync(async (req, res) => {
    const city = req.params.city;
    const currentUnix = Math.floor(Date.now() / 1000);
    const today = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'

    const topRated = await Show.aggregate([
      {
        $lookup: {
          from: "movies",
          localField: "movie",
          foreignField: "_id",
          as: "movieDetails",
        },
      },
      { $unwind: "$movieDetails" },

      {
        $lookup: {
          from: "theatres",
          localField: "theatre",
          foreignField: "_id",
          as: "theatreDetails",
        },
      },
      { $unwind: "$theatreDetails" },

      {
        $match: {
          "theatreDetails.city": city,
          startTime: { $gte: currentUnix },
          "movieDetails.ratings.imdbRating": { $gte: 8 }, // adjust threshold if needed
        },
      },

      {
        $group: {
          _id: "$movie",
          topRatedShow: { $first: "$$ROOT" },
        },
      },

      { $replaceRoot: { newRoot: "$topRatedShow" } },

      {
        $lookup: {
          from: "movies",
          localField: "movie",
          foreignField: "_id",
          as: "movie",
        },
      },
      { $unwind: "$movie" },

      {
        $project: {
          _id: "$movieDetails._id",
          title: "$movieDetails.title",
          poster: "$movieDetails.poster",
          genres: "$movieDetails.genres",
          ratings: "$movieDetails.ratings",
          length: "$movieDetails.length",
        },
      },
    ]);

    res.json(topRated);
  })
);

app.get(
  "/api/movies/:title",
  wrapAsync(async (req, res) => {
    const { title } = req.params;
    const movie = await Movie.find({ title });
    res.json(movie);
  })
);

app.post(
  "/api/theatres",
  isLoggedIn,
  isAdmin,
  wrapAsync(async (req, res) => {
    const { city, name, location, theaters } = req.body;
    const screens = [];

    for (const theatre of theaters) {
      const newScreen = new Screen({
        audi: theatre.theaterNo,
        seatTypes: theatre.seatTypes.map((type) => ({
          name: type.name,
          price: type.price,
        })),
      });
      await newScreen.save();
      screens.push(newScreen._id);
    }

    const newTheatre = new Theatre({
      name,
      city,
      location,
      screens,
    });

    await newTheatre.save();
    res.json("theatre added");
  })
);

app.get(
  "/api/theatres/:city",
  wrapAsync(async (req, res) => {
    const { city } = req.params;
    let theatres = await Theatre.find({ city }).populate("screens");
    theatres = theatres.map((theatre) => ({
      name: theatre.name,
      screens: theatre.screens.map((screen) => ({
        audi: screen.audi,
        id: screen._id,
      })),
    }));

    res.json(theatres);
  })
);

app.get(
  "/api/show/:city",
  wrapAsync(async (req, res) => {
    const { city } = req.params;
    const currentUnixTime = Math.floor(Date.now() / 1000);

    // const shows = await Show.aggregate([

    //   {
    //     $lookup: {
    //       from: "theatres",
    //       localField: "theatreId",
    //       foreignField: "_id",
    //       as: "theatre"
    //     }
    //   },
    //   { $unwind: "$theatre" },

    //   {
    //     $lookup: {
    //       from: "screens",
    //       localField: "screenId",
    //       foreignField: "_id",
    //       as: "screen"
    //     }
    //   },
    //   { $unwind: "$screen" },

    //   {
    //     $lookup: {
    //       from: "movies",
    //       localField: "movieId",
    //       foreignField: "_id",
    //       as: "movie"
    //     }
    //   },
    //   { $unwind: "$movie" },

    //   {
    //     $match: {
    //       "theatre.city": city ,
    //       startTime: { $gt: currentUnixTime }
    //     }
    //   },

    //   {
    //     $project: {
    //       _id: 1,
    //       startTime: 1,
    //       "theatre.name": 1,
    //       "screen.audi": 1,
    //       "movie.title": 1,
    //     }
    //   }
    // ]);

    let shows = await Show.find({ startTime: { $gt: currentUnixTime } })
      .populate({ path: "theatre", match: { city } })
      .populate("movie")
      .populate("screen");
    shows = shows.filter((show) => show.theatre);
    res.json(shows);
  })
);

app.get(
  "/api/shows/:city/:title/:date",
  wrapAsync(async (req, res) => {
    const { city, title, date } = req.params;
    const range = getISTDayRangeFromFormattedDate(date, 2026);

    const shows = await Show.find({
      startTime: { $gte: range.startUnix, $lte: range.endUnix },
    })
      .populate({
        path: "theatre",
        match: { city },
      })
      .populate({
        path: "movie",
        match: { title },
      });

    const validShows = shows.filter((show) => show.theatre && show.movie);

    function groupShowsByTheatre(shows) {
      const theatreMap = new Map();

      for (const show of shows) {
        const name = show.theatre.name;
        if (!theatreMap.has(name)) {
          theatreMap.set(name, []);
        }
        theatreMap.get(name).push({
          time: show.startTime,
          showId: show._id,
          language: show.language,
          format: show.format,
        });
      }

      return Array.from(theatreMap, ([name, timings]) => ({
        name,
        timings,
      }));
    }

    res.json(groupShowsByTheatre(validShows));
  })
);

app.post(
  "/api/shows",
  isLoggedIn,
  isAdmin,
  wrapAsync(async (req, res) => {
    let { city, title, theatre, showTime, showDate, format, language } =
      req.body;
    const currTheatre = await Theatre.findOne({ city, name: theatre });
    let startTime = convertToUnix(showDate, showTime);
    let newShow = new Show({
      movie: title._id,
      theatre: currTheatre,
      startTime,
      format,
      language,
    });
    await newShow.save();
    res.json("show saved");
  })
);

app.get(
  "/api/shows/:showId",
  wrapAsync(async (req, res) => {
    const showId = req.params.showId;
    const show = await Show.findById(showId)
      .populate("theatre")
      .populate("movie")
      .populate("screen");
    res.json(show);
  })
);

app.get(
  "/api/bookings/:user",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { user } = req.params;
    if (user !== req.user._id.toString()) {
      throw new expressError(
        403,
        "You are not allowed to view this user's bookings"
      );
    }
    const bookings = await Booking.find({ user }).populate({
      path: "show",
      populate: [
        { path: "theatre" }, // populate full theatre
        { path: "movie", select: "title" }, // only select title from movie
      ],
    });
    res.json(bookings.reverse());
  })
);

app.get(
  "/api/reviews/:movieId",
  wrapAsync(async (req, res) => {
    const { movieId } = req.params;
    const reviews = await Review.find({ movie: movieId }).populate(
      "user",
      "name username"
    );
    res.json(reviews);
  })
);

app.post(
  "/api/reviews",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { user, movie, rating, comment } = req.body;
    const newReview = new Review({ user, movie, rating, comment });
    await newReview.save();
    const detailedReview = await Review.findById(newReview._id).populate(
      "user",
      "name username"
    );
    res.json(detailedReview);
  })
);

app.post(
  "/api/verify",
  wrapAsync(async (req, res) => {
    const { error } = verificationSchema.validate(req.body);
    if (error) {
      throw new expressError(400, error.details[0].message);
    }
    const { email, verificationCode } = req.body;
    console.log(req.body);
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    if (user.verificationCode == verificationCode) {
      user.isVerified = true;
      await user.save();
      req.login(user, (err) => {
        if (err) {
          throw new expressError(500, err.message);
        }
        res.status(200).json({ message: "registered successfully", user });
      });
    } else {
      throw new expressError(401, "wrong verification code");
    }
  })
);

app.post(
  "/api/signup",
  wrapAsync(async (req, res) => {
    const { error } = userSchema.validate(req.body);
    if (error) {
      throw new expressError(400, error.details[0].message);
    }
    let { name, email, username, password } = req.body;
    let verificationCode = Math.floor(100000 + Math.random() * 900000);
    let user = await User.findOne({ email: email });
    if (user && !user.isVerified) {
      sendVerificationCode(user.email, user.verificationCode);
      res.status(200).json({ message: "verification code sent" });
    } else {
      const newUser = new User({ name, username, email, verificationCode });
      let registeredUser = await User.register(newUser, password);
      sendVerificationCode(
        registeredUser.email,
        registeredUser.verificationCode
      );
      res.status(200).json({ message: "verification code sent" });
    }
  })
);

app.post(
  "/api/login",
  wrapAsync(async (req, res, next) => {
    let currUser = await User.findOne({ email: req.body.email });
    if (currUser) req.body.username = currUser.username;
    if (currUser && !currUser.isVerified) {
      throw new expressError(401, "Invalid email or password");
    }
    passport.authenticate("local", (err, user, info) => {
      if (err) throw new expressError(500, "server error");
      if (!user) throw new expressError(401, "Invalid email or password");

      req.login(user, (err) => {
        if (err) throw new expressError(500, "Login failed");
        res.status(200).json({ message: "Logged in successfully", user });
      });
    })(req, res, next);
  })
);

app.get("/api/isLoggedIn", (req, res) => {
  if (req.isAuthenticated()) {
    return res.status(200).json({ message: "authenticated", user: req.user });
  }
  throw new expressError(401, "not authenticated");
});

app.get("/api/signout", (req, res) => {
  req.logout((err) => {
    if (err) {
      throw new expressError(500, "Logout failed");
    }
    res.status(200).json({ message: "logged out" });
  });
});

app.use((err, req, res, next) => {
  let { status = 500, message = "something went wrong" } = err;
  res.status(status).json({ message });
});

app.use((req, res, next) => {
  next(new expressError(404, "not found"));
});

server.listen(8080, () => {
  console.log("server started");
});
