const express = require("express");
const path = require("path");
const {open} = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname,"notes.db");
const app = express();

app.use(express.json());

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
    const hashedPassword = await bcrypt.hash(password,10);
    const selectUserQuery = `SELECT * FROM users WHERE name = ${name};`
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined){
        const createUserQuery = `INSERT INTO users (name,email,password,created_at) VALUES ('${name}','${email}','${hashedPassword}','${created_at}');`
        const dbResponse = await db.run(createUserQuery)
    }else{
        response.status(400);
        response.send("User already exist")
    }

})

app.post("/login", async (request,response) => {
    const {name,password} = request.body
    const selectUserQuery = `SELCECT * FROM users WHERE name = ${name};`
    const dbUser = db.get(selectUserQuery)
    if (dbUser === undefined){
        response.status(400)
        response.send("INVALID USER")
    }else{
        const isPasswordMatched = await bcrypt.compare(password,dbUser.password)
        if (isPasswordMatched === true){
            const payload = {
                name :name
            }
            const jwtToken = jwt.sign(payload,"jwtToken")
            response.send({jwtToken});
            response.send("Login Success")
        }else{
            response.status(400)
            response.send("Invalid Password")
        }
    }

})


app.get("/notes", async (request,response) => {
    const getNotes = `SELECT * FROM notes;`
    const notes = await db.all(getNotes);
    response.send(notes)
})

app.delete("/notes/:id", async (request,response) => {
    const {id} = request.params
    const deleteNotes = `DELETE FROM notes WHERE id = ${id};`
    await db.run(deleteNotes)
    response.send("Notes Deleted")
})

app.post("/notes", async (request,response) => {
    console.log(request.body)
    const {title,content,category,created_at,updated_at,pinned,archived} = request.body;
    console.log(created_at,updated_at,title,content)
    const postQuery = `INSERT INTO notes (title,content,category,created_at,updated_at,pinned,archived) VALUES ('${title}','${content}','${category}','${created_at}','${updated_at}','${pinned}','${archived}');`
    await db.run(postQuery)
    response.send("Notes added successfully")
})


module.exports = app