const mongoose = require("mongoose");

const Key = new mongoose.Schema({
    value: {
        type: String,
        unique: true,
        required: true
    },
    used: {
        type: Boolean,
        required: true
    }
})

module.exports = mongoose.model("key", Key)