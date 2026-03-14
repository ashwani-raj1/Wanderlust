const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { listingSchema } = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const { isLoggedIn } = require("../middleware.js");
const {storage} = require("../cloudConfig.js");
const multer = require("multer");
const upload = multer({ storage});
const Listing = require("../models/listing");

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

/* SEARCH ROUTE */
router.get("/search", async (req, res) => {
    try {

        const { q, date, guests } = req.query;

        // validation
        if(!q || q.trim() === ""){
            req.flash("error","Search location required");
            return res.redirect("/listings");
        }

        if(guests && guests < 1){
            req.flash("error","Guests must be at least 1");
            return res.redirect("/listings");
        }

        const listings = await Listing.find({
            $or: [
                { title: { $regex: q, $options: "i" } },
                { location: { $regex: q, $options: "i" } },
                { country: { $regex: q, $options: "i" } }
            ]
        });

        res.render("listings/index",{ listings });

    } catch(err){
        console.error(err);
        req.flash("error","Something went wrong");
        res.redirect("/listings");
    }
});

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
