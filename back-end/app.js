import express from "express"
import cors from "cors"
import chalk from "chalk"
import dayjs from "dayjs"
import mongodb from "mongodb"
import dotenv from "dotenv"
import Joi from "joi"

const app = express()
app.use(cors())
app.use(express.json())

const mensagens = []
const participantes = []

app.get("/participants",(req,res)=>{
    res.send(participantes)
})

app.post("/participants",(req,res)=>{
    const name = req.body;
    participantes.push(name)
    res.sendStatus(200)
})

app.get("/messages",(req,res)=>{
    let limite = req.query.limit;

    res.send(mensagens.slice(0,limite))
})

app.post("/messages",(req,res)=>{
    const {to, text, type} = req.body;
    const user = req.header('User')
    mensagens.push({to,text,type,from:user})
    res.sendStatus(200)
})

app.post("/status",(req,res)=>{
    
})

app.listen(5000, console.log(chalk.bold.green("Servidor online na porta 5000")))