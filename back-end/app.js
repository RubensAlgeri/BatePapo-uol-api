import express from "express"
import cors from "cors"
import chalk from "chalk"
import dayjs from "dayjs"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"
import Joi from "joi"
dotenv.config()

const mongoClient = new MongoClient(process.env.MONGO_URI);
let database;

const promise = mongoClient.connect();
promise.then(() => {
    database = mongoClient.db("teste"); 
    console.log(chalk.bold.blue("Banco de dados MongoDB conectado!"));
});

const app = express()
app.use(cors())
app.use(express.json())

const mensagens = []

app.get("/participants", async (req, res) => {
    try {
        await mongoClient.connect();
        database = mongoClient.db("bate-papo-uol-api");
        const participantes = await database.collection("participantes").find().toArray();
        res.send(participantes);
        mongoClient.close();
    } catch (err) {
        mongoClient.close()
    }
})

app.post("/participants", async (req, res) => {
    try {
        await mongoClient.connect();
        database = mongoClient.db("bate-papo-uol-api");
        const {name} = req.body;
        const schema = Joi.object({
            username: Joi.string()
                .min(1)
                .required()
        });
        await schema.validateAsync({username:name})
        const user = {name, lastStatus: Date.now()}
        await database.collection("participantes").insertOne(user);
        let mensagem = {from: name, to:"Todos", text: 'entra na sala...', type: 'status',time: dayjs().locale('pt-br').format('HH:mm:ss')}
        await database.collection("mensagens").insertOne(mensagem);
        res.sendStatus(200)
        mongoClient.close();
    } catch (err) {
        res.sendStatus(423)
        mongoClient.close();
    }
})

app.get("/messages", async (req, res) => {
    try {
        await mongoClient.connect();
        database = mongoClient.db("bate-papo-uol-api");
        let limite = req.query.limit;
        const mensagens = await database.collection("mensagens").find().toArray();    
        res.send(mensagens.slice(0, limite))
        mongoClient.close();
    } catch (err) {
        mongoClient.close();
    }
})

app.post("/messages", async (req, res) => {
    try {
        await mongoClient.connect();
        database = mongoClient.db("bate-papo-uol-api");
        const { to, text, type } = req.body;
        const user = req.header('User')
        mensagens.push({ to, text, type, from: user, time: dayjs().locale('pt-br').format('HH:MM:SS')})
        res.sendStatus(200)
        mongoClient.close();
    } catch (err) {
        mongoClient.close();
    }
})

app.post("/status", async (req, res) => {
    try {
        await mongoClient.connect();
        database = mongoClient.db("bate-papo-uol-api");
        mongoClient.close();
    } catch (err) {
        mongoClient.close();
    }
})

app.listen(5000, console.log(chalk.bold.green("Servidor online na porta 5000")))