const mongoose = require("mongoose");

const UserData = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
        maxlength: 30,
        minlength: 1
    },
    depth: {
        type: Number,
        required: true
    },
    gameState: {
        type: String,
        enum: ["start", "lab", "selection", "fight"],
        required: true
    },
    alive: {
        type: Array,
        required: true
    },
    money: {
        type: Array,
        required: true
    },
    crystals: {
        type: Number,
        required: true
    },
    crowns: {
        type: Number,
        required: true
    },
    creatures:{ 
        type: Array,
        required: true
    },
    selectedCreature:{
        type: Number,
        required: true,
        min: 0,
        max: 2
    },
    enemyId:{
        type: String,
        required: true
    },
    storeUnlocks:{
        type: Array,
        required: true
    },
    seed:{
        type: Number,   
        required: true
    }
})

module.exports = mongoose.model("userData", UserData)