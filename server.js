const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors  = require("cors");
const app = express();
const userRoute = require('./routes/userRoutes');
const taskRoute = require('./routes/taskRoutes');
const taskShareRoute = require('./routes/taskShareRoutes');
dotenv.config();


app.use(cors());
app.use(cors({
    origin:process.env.FRONTEND_URL
}));
app.use(bodyParser.json()); //it parse the  json data
app.use(bodyParser.urlencoded({extended:true})); //it parse also form data
app.use("/api/user",userRoute);
app.use("/api/task",taskRoute);
app.use("/taskshare",taskShareRoute);


mongoose
.connect(process.env.MONGODB_URL)
.then(()=>console.log("MongoDB Connected Successfully!"))
.catch((err)=>console.log("Error: ",err));

app.get("/",(req,res)=>{
    res.send("PRO MANAGER APP");
});

const PORT = process.env.PORT;
app.listen(PORT,()=>{
    console.log(`Server is running on http://localhost:${PORT}`);
})