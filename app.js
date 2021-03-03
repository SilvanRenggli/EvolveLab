const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv/config')

const app = express()

const Creature = require('./model/creature')
const User = require('./model/user')
const Token = require('./model/tokens')
const UserData = require('./model/userData')
const Key = require('./model/key')


const PORT = process.env.PORT || 5000
const VERSION = process.env.VERSION


app.use(express.json());

app.post('/login', async (req, res) => {
    var user = await User.findOne({name: req.body.name})
    if (VERSION != req.body.version) return res.status(400).send('Version too old')
    if(user == null){
        return res.status(404).send('cannot find user')
    }
    try{
        if (await bcrypt.compare(req.body.password, user.password)){
            const username = {username: user.name}
            const accessToken = generateAccessToken(username)
            const refreshToken = jwt.sign(username, process.env.REFRESH_TOKEN_SECRET)
            user = await User.findOneAndUpdate( {name: req.body.name }, {
                $inc : { "loginCounter" : 1 } },
                {new: true})
            res.json({accessToken: accessToken,refreshToken: refreshToken, loginCounter: user.loginCounter, dna: user.DNAPoints, creatures: user.unlockedCreatures})
            const token = new Token({token: refreshToken})
            await token.save()
            res.status(200).send()

        } else {
            res.sendStatus(403)
        }
    }catch (e){
        console.log(e)
        res.status(500).send()
    }
})

app.post('/token', async (req,res) => {
    const refreshToken = req.body.token
    if (refreshToken == null) return res.sendStatus(401)
    const token = await Token.findOne({token: refreshToken})
    if (token == null) return res.sendStatus(403) 
    jwt.verify(token.token, process.env.REFRESH_TOKEN_SECRET, (err, username) =>{
        if (err) return res.sendStatus(403)
        const accessToken = generateAccessToken({ username: username.username})
        res.json({accessToken: accessToken})
    })
})

app.delete('/logout', async (req, res) => {
    await Token.findOneAndDelete({token: req.body.token})
    res.send(204)
})

app.post("/store_creature", authenticateToken, async (req, res) => {
    //stores a new creature
    const creature = new Creature(req.body.creature)
    if (creature.owner !== req.username.username) { return res.sendStatus(403) }
    try{
        await creature.save()
        res.sendStatus(200)
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
});

app.post("/create_user", async (req, res) => {
    //registers a new user
    const key = await Key.findOne({value : req.body.key})
    if (key == null) return res.sendStatus(401)
    if (key.used) return res.sendStatus(400)
    var user = await User.findOne({ name: req.body.name})
    if (user != null) return res.sendStatus(406)
    user = new User(req.body)
    
    try {
        user.password = await bcrypt.hash(req.body.password, 10)
        key.used = true
        await user.save()
        await key.save()
        res.status(201).send(user)
    }catch(e){
        console.log(e)
        res.status(500).send()
    }
});

app.post("/update_user_data", authenticateToken, async(req, res) => {
    //replaces the userdata in the DB with the one from the body
    try{
    const filter = { name: req.username.username }
    const newUserData = req.body.userData
    const dna = req.body.dna
    const unlockedCreature = req.body.unlockedCreature
    const oldUserData = await UserData.findOne(filter)
    const userInfo = await User.findOne(filter)
    if ( await !checkUserUpdate(newUserData, oldUserData) ) return res.sendStatus(403)
    await UserData.replaceOne(filter, newUserData, {upsert: true} )
    await userInfo.update({$set: {"DNAPoints": dna}})
    if (unlockedCreature != null){
        await userInfo.update({ $push : {"unlockedCreatures" : unlockedCreature}})
    }
    res.status(201).send()
    }catch(e){
        console.log(e)
        res.status(500).send()
    }

}) 

app.post("/update_creature_reaction", authenticateToken, async(req, res) => {
    try{
        const reaction = req.body.reaction
        const username = req.username.username
        const creatureId = req.body.creatureId
        const new_reaction = req.body.new_reaction

        
        if (new_reaction){ 
            switch(reaction){

                case "love":
                    await Creature.update({_id: creatureId}, { $push: {"love": username} } )
                    res.status(201).send()
                    break
                
                case "hate":
                    await Creature.update({_id: creatureId}, { $push: {"hate": username} } )
                    res.status(201).send()
                    break

                case "idea":
                    await Creature.update({_id: creatureId}, { $push: {"idea": username} } )
                    res.status(201).send()
                    break
                }


        } else{ 
            console.log("remove")

            switch(reaction){

                case "love":
                    await Creature.update({_id: creatureId}, { $pull: {"love": username} } )
                    res.status(201).send()
                    break
                
                case "hate":
                    await Creature.update({_id: creatureId}, { $pull: {"hate": username} } )
                    res.status(201).send()
                    break

                case "idea":
                    await Creature.update({_id: creatureId}, { $pull: {"idea": username} } )
                    res.status(201).send()
                    break
                }

        }
    }catch(e){
        console.log(e)
        res.status(500).send()
    }

})

function checkUserUpdate( newUserData, oldUserData) {
    if( oldUserData == null) return true
    return (
        newUserData.name === oldUserData.name &&
        newUserData.map_row - oldUserData.map_row <= 1 &&
        newUserData.money[0] - oldUserData.money[0] <= 20 &&
        newUserData.money[1] - oldUserData.money[1] <= 20 &&
        newUserData.money[2] - oldUserData.money[2] <= 20
    )
}

app.get("/load_user_data", authenticateToken, async(req, res) => {
    //loads all the user data from the server
    try{
        const filter = { name: req.username.username }
        const data = await UserData.findOne(filter)
        const info = await User.findOne(filter)
        const dna = info.DNAPoints
        const unlockedCreatures = info.unlockedCreatures
        if (data == null) return res.sendStatus(400)
        res.status(200).send({"userData" : data, "dna": dna, "unlockedCreatures": unlockedCreatures})
    }catch(e){
        console.log(e)
        res.status(500).send()
    }
})

app.get("/load_enemy", authenticateToken, async(req, res) => {
    try{
        const filter = { _id: req.body.id }
        const data = await Creature.findOne(filter)
        res.status(200).send(data)
    }catch(e){
        console.log(e)
        res.status(500).send()
    }
})

app.get("/get_scores", async (req, res) => {
    //calculates user scores
    try {
        const scores = await Creature.aggregate([{
                $group: {
                _id : "$owner",
                //score is calculated as depth^2 * ( 1 + max (battlePoints, 1)
                score: {$sum : 
                    { $multiply : [
                            { $multiply : [ "$depth", "$depth" ] },
                            { $max : ["$battlePoints", 0 ] }
                        ]
                    }},
                deepest : {$max : "$depth"},
                kills : {$sum : "$kills"},
                creatures : {$sum: 1} 
            }},  
            { $sort: { score: -1 }}
        ])
        res.send(scores).status(200)
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
});

app.get("/get_creatures", async (req, res) => {
    try {
        const creatures = await Creature.find({}).sort({depth: -1})
        res.send(creatures).status(200)
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
});

app.get("/get_depth_info", authenticateToken, async (req, res) => {

    const depth = req.body.depth
    var depthInfo = {
        endReached: false,
        topCreatures: []
    }
    try{
        var creature = await Creature.aggregate([
            { $match: { depth: depth } },
            { $sample: { size: 1 } }
        ])
        //check whether end was reached
        depthInfo.endReached = ( creature.length == 0 )

        //add the top three creatures to the body
        depthInfo.topCreatures = await Creature.find({ depth: depth, battlePoints: { $gte: 5 } }).sort({ battlePoints: -1 }).limit(3)

        res.send(depthInfo).status(200)
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
    
});

app.get("/get_map_info", async (req, res) => {
    var max_creature = await Creature.find().sort({depth: -1}).limit(1)
    if (!max_creature.length){
        res.send({}).status(200)
        return
    } 
    var max_depth = max_creature[0]["depth"]
    var map_info = []
    for (var i = 1; i <= max_depth; i++){
        var strong_creatures = await Creature.distinct( "type", { depth: i, battlePoints: {$gte: 5}})
        var average_creatures = await Creature.distinct( "type", { depth: i, battlePoints: {$gt: -5, $lt: 5}} )
        var weak_creatures = await Creature.distinct("type", {depth: i, battlePoints: {$lte: -5}})
        var creature_types = await Creature.distinct( "type" , { depth: i} )
        var depth_info = {}
        depth_info["Strong"] = strong_creatures
        depth_info["Average"] = average_creatures
        depth_info["Weak"] = weak_creatures
        depth_info["Types"] = creature_types
        map_info.push(depth_info)

    }
    res.send(map_info).status(200)
})

app.get("/get_enemy", async (req, res) => {
    const type = req.body.type
    const diff = req.body.diff
    const depth = req.body.depth
    var enemy
    if (type === "random"){
        switch(diff){
            case -1:
                enemy = await Creature.aggregate([
                    { $match: { depth: depth } },
                    { $sample: { size: 1 } }
                    ])
                break
            case 0:
                enemy = await Creature.aggregate([
                    { $match: { depth: depth , battlePoints: {$lte: -5}} },
                    { $sample: { size: 1 } }
                    ])
                    break
            case 1:
                enemy = await Creature.aggregate([
                    { $match: { depth: depth , battlePoints: {$gt: -5, $lt: 5}} },
                    { $sample: { size: 1 } }
                    ])
                break
            case 2:
                enemy = await Creature.aggregate([
                    { $match: { depth: depth , battlePoints: {$gte: 5}} },
                    { $sample: { size: 1 } }
                    ])
                    break
        }
        res.send(enemy).status(200)
        return
    }
    //request must be a creature type
    switch(diff){
        case -1:
            enemy = await Creature.aggregate([
                { $match: { depth: depth, type: type } },
                { $sample: { size: 1 } }
                ])
            break
        case 0:
            enemy = await Creature.aggregate([
                { $match: { depth: depth, type: type, battlePoints: {$lte: -5}} },
                { $sample: { size: 1 } }
                ])
                break
        case 1:
            enemy = await Creature.aggregate([
                { $match: { depth: depth, type: type, battlePoints: {$gt: -5, $lt: 5}} },
                { $sample: { size: 1 } }
                ])
            break
        case 2:
            enemy = await Creature.aggregate([
                { $match: { depth: depth, type: type, battlePoints: {$gte: 5}} },
                { $sample: { size: 1 } }
                ])
                break
    }
    res.send(enemy).status(200)
})

app.post("/update_enemy", authenticateToken, async (req, res) => {
    //updates an enemy
    try{
        const id = req.body.id
        const won = req.body.won
        const badge = req.body.badge
        if (won){
            if (badge){
                await Creature.findOneAndUpdate( { _id : id }, {
                    $inc : { "kills" : 1 , "battlePoints" : 1}, 
                    $push : { "badges" : badge}})
            }else{
                await Creature.findOneAndUpdate( { _id : id }, {
                    $inc : { "kills" : 1 , "battlePoints" : 1} })
            }
        }else{
            var creature = await Creature.findOne({_id : id})
            var badges = creature.badges
            badges = badges.sort()
            badges.pop()
            await Creature.findOneAndUpdate( { _id : id }, {
                $inc : { "battlePoints" : -1 },
                $set : { "badges" : badges}
            })
        }
        res.sendStatus(200)
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }

});

//Middleware
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] //only get the token from the header
    if (token == null) return res.sendStatus(401)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, username) => {
        if (err) return res.send().status(403)
        req.username = username
    })
    const data = await User.findOne({name: req.username.username})
    if (req.body.loginCounter == null) return res.send().status(403)
    if (data.loginCounter > req.body.loginCounter) return res.send().status(403)
    next()
}


function generateAccessToken(username) {
    return jwt.sign(username, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' })
}

mongoose.connect(process.env.DB_CONNECTION_STRING,
                { useNewUrlParser: true, useUnifiedTopology: true },(req, res) =>{
    console.log("Connected to the database")
})

app.listen(PORT,() => {
    console.log("listening to 3000")
});
