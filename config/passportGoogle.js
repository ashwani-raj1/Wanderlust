const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {

        let existingUser = await User.findOne({
          email: profile.emails[0].value,
        });

        if (existingUser) {
          return done(null, existingUser);
        }

        const newUser = new User({
          username: profile.emails[0].value,
          email: profile.emails[0].value,
        });

        const savedUser = await newUser.save();

        return done(null, savedUser);

      } catch (err) {
        return done(err, null);
      }
    }
  )
);