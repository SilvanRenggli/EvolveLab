const mongoose = require("mongoose");

const Token = new mongoose.Schema({
    token: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("tokens", Token)