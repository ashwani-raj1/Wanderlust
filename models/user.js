const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },

    isVerified: {
        type: Boolean,
        default: false,
    },
    otp: String,
    otpExpires: Date,

    profile: {
        type: String,
        default: "https://via.placeholder.com/150"
    },
    firstname: {
        type: String
    },
    lastname: {
        type: String
    },
    phone: {
        type: String
    },
    bio: {
        type: String
    },
    country: String,
    city: String,
    state: String,
    pin: String,

    createdAt: {
        type: Date,
        default: Date.now
    }

});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);