const mongoose = require("mongoose");

const User = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
        maxlength: 30,
        minlength: 1
    },
    email: {
        type: String,
        required: true,
        maxlength: 320,
        minlength: 3
    },
    password: {
        type: String,
        required: true
    },
    DNAPoints: {
        type: Number,
        required: true
    },
    unlockedCreatures: {
        type: Array,
        required: true
    },
    loginCounter: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model("users", User)