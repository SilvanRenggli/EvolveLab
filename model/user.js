const mongoose = require("mongoose");

const User = new mongoose.Schema({
    name: String,
    deepest: Number,
    kills: Number,
    score: Number
})

module.exports = mongoose.model("users", User)