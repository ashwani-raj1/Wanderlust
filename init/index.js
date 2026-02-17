const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

main().then((res)=>{
    console.log("Connection succesful");
}).catch((err)=>{
    console.log(err);
});

async function main(){
    await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust');
}

const initDB = async () =>{
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj) => ({...obj,owner: "698b9c7bcdc5d32e7b61e6c9"}));
    await Listing.insertMany(initData.data);
    console.log("Data was initialized");
};
initDB();

