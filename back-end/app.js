import express from "express"
import cors from "cors"
import chalk from "chalk"
import dayjs from "dayjs"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import Joi from "joi"
dotenv.config()

const mongoClient = new MongoClient(process.env.MONGO_URI);
let database = null;

const promise = mongoClient.connect();
promise.then(() => {
    database = mongoClient.db(process.env.BANCO);
    console.log(chalk.bold.blue("Banco de dados MongoDB conectado!"));
});

const app = express()
app.use(cors())
app.use(express.json())

const mensagens = []

app.get("/participants", async (req, res) => {
    try {
        const participantes = await database.collection("participantes").find().toArray();
        res.send(participantes);
    } catch (err) {
    }
})

app.post("/participants", async (req, res) => {
    const { name } = req.body;
    const schema = Joi.object({
        username: Joi.string().min(1).required()
    });
    const validacao = schema.validate({ username: name })
    if (validacao.error) {
        res.status(422).send(validacao.error.details.message)
        return
    }
    try {
        const participante = await database.collection("participantes").findOne({ name });
        if (!participante) {
            const user = { name, lastStatus: Date.now() }
            await database.collection("participantes").insertOne(user);
            let mensagem = { from: name, to: "Todos", text: 'entra na sala...', type: 'status', time: dayjs().locale('pt-br').format('HH:mm:ss') }
            await database.collection("mensagens").insertOne(mensagem);
            res.sendStatus(201)
        } else {
            res.sendStatus(409)
        };
    } catch (err) {
        res.sendStatus(423);
    }
})

app.get("/messages", async (req, res) => {
    try {
        const username = req.header('User')
        let limite = req.query.limit;
        if (!limite) limite = 100;
        const mensagens = await database.collection("mensagens").find({ $or: [{ to: username }, { to: "Todos" }, { type: "status" }, { type: "message" }, { from: username }] }).toArray();
        res.send(mensagens.slice(-limite));
    } catch (err) {
        ;
    }
})

app.post("/messages", async (req, res) => {
    try {
        const { to, text, type } = req.body;
        const username = req.header('User')
        const participante = await database.collection("participantes").findOne({ name: username });
        const schema = Joi.object({
            to: Joi.string().min(1).required(),
            text: Joi.string().min(1).required(),
            type: Joi.string().valid("message", "private_message").required(),
            from: Joi.string().valid(participante.name).required()
        });
        const validacao = schema.validate({ to, type, text, from: username }, { abortEarly: false })
        if (validacao.error) {
            res.status(422).send(validacao.error.details.message)
            return
        }
        let mensagem = { from: username, to, text, type,  time: dayjs().locale('pt-br').format('HH:mm:ss') }
        await database.collection("mensagens").insertOne(mensagem);
        res.sendStatus(201);
    } catch (err) {
        res.sendStatus(422);
    }
})

app.post("/status", async (req, res) => {
    try {
        const username = req.header('User')
        const participante = await database.collection("participantes").findOne({ name: username });
        if (participante) {
            await database.collection("participantes").updateOne({ name: participante.name }, { $set: { lastStatus: Date.now() } });
            res.sendStatus(200)
        }
    } catch (err) {
        res.sendStatus(404);
    }
})

app.put("/messages/:ID", async (req, res)=>{
    try{
        const username = req.header('User')
        const id = req.params.ID

    }catch(err){

    }
})

app.delete("/messages/:ID", async (req, res)=>{
    try{
        const username = req.header('User')
        const id = req.params.ID
        const mensagem = await database.collection("mensagens").findOne({_id: new ObjectId(id)})
        const schema = Joi.object({
            from: Joi.string().valid(mensagem.from)
        })
        const validacao = schema.validate({from:username})
        if(validacao.error){
            res.status(404).send(validacao.error.details.message)
            return
        }
        await database.collection("mensagens").deleteOne({_id: new ObjectId(id)})
    }catch(err){

    }
})

setInterval(async () => {
    try {
        const participantes = await database.collection("participantes").find().toArray();
        participantes.forEach(async participante => {
            try {
                if (Date.now() - participante.lastStatus > 10000) {
                    await database.collection("participantes").deleteOne({ name: participante.name });
                    let mensagem = { from: participante.name, to: "Todos", text: 'sai da sala...', type: 'status', time: dayjs().locale('pt-br').format('HH:mm:ss') }
                    await database.collection("mensagens").insertOne(mensagem);

                }
            } catch (err) {
                console.log(err)
            }

        })
    } catch (err) {
        console.log(err)
    }
}, 15000)


app.listen(5000, console.log(chalk.bold.green("Servidor online na porta 5000")))