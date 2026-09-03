const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userProfile = new Schema({
  profile: { type: String  },
  firstname: { type: String , required: true },
  lastname: { type: String  },
  email: {
  type: String,
  required: true,
  unique: true,
  match: /.+\@.+\..+/
},
  phone: { type: String},
  bio: { type: String },
  country: { type: String  },
  city: { type: String  },
  state: { type: String  },
  pin: { type: String  },
},{ timestamps: true });;

module.exports = mongoose.model("UserProfile", userProfile);
