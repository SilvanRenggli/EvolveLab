const mongoose = require("mongoose");

const Creature = new mongoose.Schema({
    StateMachine: Array,
    direction_change_time: Number,
    health: Number,
    name: String,
    nr_of_states: Number,
    speed: Number,
    strength: Number,
    transition_time: Number,
    depth: Number,
    owner: String
})

module.exports = mongoose.model("creatures", Creature);