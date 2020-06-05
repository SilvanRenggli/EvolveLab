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
                    {$multiply: ["$depth", {"$literal" : 2}]},
                    {$add: ["$kills", {"$literal" : 1}]}]}},
                deepest : {$max : "$depth"},
                kills: {$sum : "$kills"}}},  
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
    try{
        const id = req.body["id"];
        var winratio = req.body["winratio"];
        var depth = req.body["depth"]
        if (req.body["won"]){
            await Creature.update({"_id" : id},{$inc: {"kills": 1}})
            winratio += 1
            if(winratio > 2){
                await Creature.update(
                    {"_id" : id}, 
                    {$set: {"depth" : depth + 1, "winratio" : -2}});
            }else{
                await Creature.update(
                    {"_id" : id}, 
                    {$set: {"winratio" : winratio }});
            }
        }else{
            winratio -= 1;
            if(winratio < -2 && req.body["depth"] != 0){
                await Creature.update(
                    {"_id" : id}, 
                    {$set: {"depth" : depth - 1, "winratio" : 2}});
            }else{
                await Creature.update(
                    {"_id" : id}, 
                    {$set: {"winratio" : winratio }});
            }
        }
        res.send("hello")
    } catch(err){
        res.send({message: err})
        console.log(err)
    }
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

mongoose.connect(process.env.DB_CONNECTION_STRING,
                { useNewUrlParser: true, useUnifiedTopology: true },(req, res) =>{
    console.log("Connected to the database")
})

app.listen(PORT,() => {
    console.log("listening to 3000")
});
