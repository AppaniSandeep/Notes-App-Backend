const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());
const path = require("path");
const {open} = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken");


const dbPath = path.join(__dirname, "notes.db");


let db;

const intializeDbAndServer = async () => {
    try{
        db = await open ({
            filename:dbPath,
            driver:sqlite3.Database

        })
        app.listen(3000, () => {
            console.log("server runnning at 3000")
        })

    }catch(e){
        console.log(e.message)
        process.exit(1)
    }
}
intializeDbAndServer()

app.post('/signup', async (request,response) => {
    const {name,email,password,created_at} = request.body

    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM users WHERE email = ?;`
    const dbUser = await db.get(selectUserQuery,[email]);
    if (dbUser === undefined){
        const postQuery = `INSERT INTO users (name,email,password,created_at) VALUES (?,?,?,?);`
        await db.run(postQuery,[name,email,hashedPassword,created_at]);
        response.status(200).json({message:"User Added"})        
    }else{
        response.status(400).json({message:"User already exist"})
    }
})

app.post("/login", async (request,response) => {
    const {name,password} = request.body
    const selectUserQuery = `SELECT * FROM users WHERE name = ?;`
    const dbUser = await db.get(selectUserQuery,[name])
    if (dbUser === undefined){
        response.status(400).json({error:"INVALID USER"})
    }else{
        const isPasswordMatched = await bcrypt.compare(password,dbUser.password)
        if (isPasswordMatched === true){
            const payload = {
                name: name,
            };
            const jwtToken = jwt.sign(payload, "SECRET_TOKEN")
            response.status(200).json({message:"Login Success",jwtToken})
        }else{
            response.status(400).json({message:"Invalid Password"})
        }
    }

})


app.get("/notes", async (request,response) => {
    let jwtToken;
    const authHeader = request.headers["authorization"]
    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
        response.status(401)
        response.send("JwtToken Invalid")
    } else {
        jwt.verify(jwtToken, "SECRET_TOKEN", async (error, payload) => {
            if (error) {
                response.send("Invalid JWT Token")
            } else {
                const getNotes = `SELECT * FROM notes;`
                const notes = await db.all(getNotes);
                response.send(notes)
            }
        })
    }

})

app.delete("/notes", async (request,response) => {
    const deleteNotes = `DELETE FROM notes;`
    await db.run(deleteNotes)
    response.send("Notes Deleted")
})

app.post("/notes", async (request,response) => {
    const {title,content,category,created_at,updated_at,pinned,archived} = request.body;
    const postQuery = `INSERT INTO notes (title,content,category,created_at,updated_at,pinned,archived) VALUES ('${title}','${content}','${category}','${created_at}','${updated_at}','${pinned}','${archived}');`
    await db.run(postQuery)
    response.send("Notes added successfully")
})

app.put("/notes/:id", async (request, response) => {
    const { id } = request.params;
    const { title, content, category, updated_at, pinned, archived } = request.body;
    console.log(request.body)
    const authHeader = request.headers["authorization"];
    let jwtToken;
    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
        response.status(401)
        response.send("Inavalid Jwt Token")
    } else {
        jwt.verify(jwtToken, "SECRET_TOKEN", async (error, payload) => {
            if (error) {
                response.send("Inavalid JWT Token")
            } else {
                const updateQuery = `UPDATE notes SET title='${title}',content='${content}',category='${category}',updated_at='${updated_at}',pinned='${pinned}',archived='${archived}' WHERE id = ${id};`
                await db.run(updateQuery);
                response.send("Note Updated")
            }
        })

    }


})
module.exports = app