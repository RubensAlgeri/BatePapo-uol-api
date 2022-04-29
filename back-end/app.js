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
        const { name } = req.body;
        const participante = await database.collection("participantes").findOne({ name });
        if (!participante) {
            const schema = Joi.object({
                username: Joi.string()
                    .min(1)
                    .required()
            });
            await schema.validateAsync({ username: name })
            const user = { name, lastStatus: Date.now() }
            await database.collection("participantes").insertOne(user);
            let mensagem = { from: name, to: "Todos", text: 'entra na sala...', type: 'status', time: dayjs().locale('pt-br').format('HH:mm:ss') }
            await database.collection("mensagens").insertOne(mensagem);
            res.sendStatus(201)
        }else{
            res.sendStatus(409)
        }
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
        const username = req.header('User')
        let limite = req.query.limit;
        if (!limite) limite = 100;
        const mensagens = await database.collection("mensagens").find({ $or: [{ to: username }, { to: "Todos" }, { type: "status" }, { type: "message" }, { from: username }] }).toArray();
        res.send(mensagens.slice(-limite))
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
        const username = req.header('User')
        const participante = await database.collection("participantes").findOne({ name: username });
        const schema = Joi.object({
            to: Joi.string()
                .min(1)
                .required(),
            text: Joi.string()
                .min(1)
                .required(),
            type: Joi.string()
                .valid("message", "private_message")
                .required(),
            from: Joi.string()
                .valid(participante.name)
                .required()
        });
        await schema.validateAsync({ to, type, text, from: username })
        let mensagem = { to, text, type, from: username, time: dayjs().locale('pt-br').format('HH:mm:ss') }
        await database.collection("mensagens").insertOne(mensagem);
        res.sendStatus(201)
        mongoClient.close();
    } catch (err) {
        res.sendStatus(422)
        mongoClient.close();
    }
})

app.post("/status", async (req, res) => {
    try {
        await mongoClient.connect();
        database = mongoClient.db("bate-papo-uol-api");


        const username = req.header('User')
        const participante = await database.collection("participantes").findOne({ name: username });
        if (participante) {
            console.log("atualizei status do ", username)
            await database.collection("participantes").updateOne({ name: participante.name }, { $set: { lastStatus: Date.now() } });
        }

        mongoClient.close();
    } catch (err) {
        res.sendStatus(404)
        mongoClient.close();
    }
})

setInterval(async () => {
    try {
        await mongoClient.connect();
        database = mongoClient.db("bate-papo-uol-api");
        const participantes = await database.collection("participantes").find().toArray();
        participantes.forEach(async participante => {
            try {
                if (Date.now() - participante.lastStatus > 10000) {
                    await database.collection("participantes").deleteOne({ name: participante.name });
                    let mensagem = { from: participante.name, to: "Todos", text: 'sai da sala...', type: 'status', time: dayjs().locale('pt-br').format('HH:mm:ss') }
                    await database.collection("mensagens").insertOne(mensagem);
                    mongoClient.close()
                }
            } catch (err) {

                mongoClient.close()
            }
            mongoClient.close()
        })
    } catch (err) {
        mongoClient.close()
    }
}, 15000)


app.listen(5000, console.log(chalk.bold.green("Servidor online na porta 5000")))