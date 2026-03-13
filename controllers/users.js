const User = require("../models/user");

module.exports.renderSignupForm = (req,res)=>{
    res.render("users/signup", { formData: {} });
}

// module.exports.signup = async (req, res, next) => {
//   try {
//     let { username, email, password } = req.body;
//     const newUser = new User({ email, username });
//     const registeredUser = await User.register(newUser, password);

//     req.login(registeredUser, (err) => {
//       if (err) return next(err);

//       req.flash(
//         "success",
//         `Welcome ${username}, You have successfully registered`,
//       );
//       res.redirect("/listings");
//     });
//   } catch (err) {
//     req.flash("error", err.message);
//     res.redirect("/signup");
//   }
// };


module.exports.signup = async (req, res, next) => {

  const { username, email, password, otp } = req.body;

  const user = await User.findOne({ email });

  // OTP not entered
  if (!otp || otp.trim() === "") {
    req.flash("error", "Enter OTP");
    return res.render("users/signup", {
      formData: { username, email, password }
    });
  }

  // OTP not requested
  if (!user) {
    req.flash("error", "Please request OTP first");
    return res.render("users/signup", {
      formData: { username, email, password }
    });
  }

  // Invalid OTP
  if (user.otp !== otp) {
    req.flash("error", "Invalid OTP");
    return res.render("users/signup", {
      formData: { username, email, password }
    });
  }

  // OTP expired
  if (user.otpExpires < Date.now()) {
    req.flash("error", "OTP expired");
    return res.render("users/signup", {
      formData: { username, email, password }
    });
  }

  try {

    const newUser = new User({ username, email });

    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
      if (err) return next(err);

      req.flash("success", "Welcome to Wanderlust!");
      res.redirect("/listings");
    });

  } catch (err) {

    req.flash("error", err.message);

    res.render("users/signup", {
      formData: { username, email, password }
    });

  }

};

module.exports.renderLoginForm = (req, res) => {
  res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
  req.flash("success", "Welcome back to wanderlust");
  let redirectUrl = res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "you are logged out");
    res.redirect("/listings");
  });
};
