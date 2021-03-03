const mongoose = require("mongoose");

const UserData = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
        maxlength: 30,
        minlength: 1
    },
    map: {
        type: Array,
        required: true
    },
    map_row: {
        type: Number,
        required: true
    },
    map_col: {
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
    storeOptions: {
        type: Array,
        required: true
    },
    privateStore: {
        type: Array,
        required: true
    },
    reroll: {
        type: Number,
        required: true
    },
    actionKey: {
        type: Number,
        required: true
    },
    moduleKey: {
        type: Number,
        required: true
    },
    modifierKey: {
        type: Number,
        required: true
    },
    banish: {
        type: Number,
        required: true
    },
    increase: {
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