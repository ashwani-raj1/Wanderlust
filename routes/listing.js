const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { listingSchema } = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const { isLoggedIn } = require("../middleware.js");
const {storage} = require("../cloudConfig.js");
const multer = require("multer");
const upload = multer({ storage});


const listingController = require("../controllers/listings.js");

/*  VALIDATION MIDDLEWARE  */

const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  }
  next();
};



/*  INDEX ROUTE  */

router.get("/", wrapAsync(listingController.index));

/*  NEW ROUTE   */

router.get("/new", 
  isLoggedIn, listingController.renderNewForm
);

/*  CREATE ROUTE  */

router.post(
  "/",isLoggedIn,upload.single("listing[image]"),validateListing,wrapAsync(listingController.createListing)
);


/*  SHOW ROUTE  */

router.get("/:id", wrapAsync(listingController.showListing));

/*  EDIT ROUTE  */

router.get("/:id/edit", isLoggedIn, wrapAsync(listingController.editListing));

/*  UPDATE ROUTE  */

router.put(
  "/:id",
  isLoggedIn,
  upload.single("listing[image]"),
  validateListing,
  wrapAsync(listingController.updateListing),
);

/*  DELETE ROUTE  */

router.delete("/:id", isLoggedIn, wrapAsync(listingController.deleteListing));

module.exports = router;
