const express = require("express")
const mongoose = require("mongoose")
require("dotenv/config")

const app = express()
const Creature = require("./model/creatures")
const User = require("./model/user")
var PORT = process.env.PORT || 5000;

app.use(express.json());

app.post("/create_creature", async (req, res) => {
    try{
        const creature = new Creature(req.body);
        creature["crystalls"] = 0;
        creature["crystall_countdown"] = 3;
        creature["dna"] = {}
        await creature.save();
        res.send(creature)
    } catch(err){
        res.send({message: err})
        console.log(err)
    }
});

app.post("/create_user", async (req, res) => {
    try{
        const user = new User(req.body);
        await user.save();
        res.send(user)
    } catch(err){
        res.send({message: err})
        console.log(err)
    }
});

app.get("/calc_user_score", async (req, res) => {
    try{
        Creature.aggregate([
            {$group: {
                _id : "$owner",
                score: {$sum : {$multiply :[
                    {$multiply: ["$depth", "$depth"]},
                    {$add: ["$kills", {"$literal" : 1}]}]}},
                deepest : {$max : "$depth"},
                kills : {$sum : "$kills"},
                creatures : {$sum: 1} 
            }},  
            {$sort: {score: -1}}
        ])
        .exec()
        .then(doc => {
            console.log(doc)
            res.status(200).json(doc);
        })
    } catch(err){
        res.send({message: err})
        console.log(err)
    }
});


app.post("/update_enemy", async (req, res) => {
    console.log("called_update_enemy")
    const id = req.body["id"];
    var depth = req.body["depth"]
    var player_badges = req.body["badges"]
    Creature.find({depth: depth}).countDocuments().exec(async function (err, count) {
        Creature.findOne({"_id": id}).exec(async function (err, creature){
            badges = req.body["badges"]
            if (req.body["won"]){
                if (badges.length){
                    creature.badges.push(badges.sort().pop())
                } 
                creature.kills += 1;
                creature.crystall_countdown -= 1;
                creature.winratio += 1;
                if(creature.winratio > 2 && count > 1){
                    await Creature.update(
                        {"_id" : id}, 
                        {$set: {"depth" : depth + 1, "winratio" : -2, "kills": creature.kills, "crystall_countdown": creature.crystall_countdown, "badges" : creature.badges}});
                }else{
                    await Creature.update(
                        {"_id" : id}, 
                        {$set: {"winratio" : creature.winratio, "kills": creature.kills, "crystall_countdown": creature.crystall_countdown, "badges" : creature.badges}});
                }
                if(creature.crystall_countdown < 1){
                    await Creature.update(
                        {"_id" : id},
                        {$set: {"crystalls" : creature.crystalls + 1, "crystall_countdown" : 3}});
                }
            }else{
                creature.badges.sort()
                creature.badges.pop()
                creature.winratio -= 1
                creature.crystalls = 0
                if(creature.winratio < -2 && depth > 1 && count > 1){
                    await Creature.update(
                        {"_id" : id}, 
                        {$set: {"depth" : depth - 1, "winratio" : 2, "crystalls": creature.crystalls, "badges" : creature.badges}});
                }else{
                    await Creature.update(
                        {"_id" : id}, 
                        {$set: {"winratio" : creature.winratio, "crystalls": creature.crystalls, "badges" : creature.badges }});
                }
            }
            res.send(creature)
        }) 
    }).catch(err)
});

app.get("/load_creature", async (req, res) => {

    var depth = req.body["depth"];
    Creature.find({depth: depth}).countDocuments().exec(function (err, count) {

    // Get a random entry
    var random = Math.floor(Math.random() * count)
  
    Creature.findOne({depth: depth}).skip(random)
    .exec()
    .then(doc => {
        console.log(doc)
        res.status(200).json(doc);
    })
    .catch(err)
  })
})

app.get("/load_crystall_creature", async (req, res) => {

    var depth = req.body["depth"];
    Creature.find({depth: depth, crystalls: { $gt: 0}}).countDocuments().exec(function (err, count) {

    // Get a random entry
    var random = Math.floor(Math.random() * count)
  
    Creature.findOne({depth: depth, crystalls: { $gt: 0}}).skip(random)
    .exec()
    .then(doc => {
        console.log(doc)
        res.status(200).json(doc);
    })
    .catch(err)
  })
})

mongoose.connect(process.env.DB_CONNECTION_STRING,
                { useNewUrlParser: true, useUnifiedTopology: true },(req, res) =>{
    console.log("Connected to the database")
})

app.listen(PORT,() => {
    console.log("listening to 3000")
});
