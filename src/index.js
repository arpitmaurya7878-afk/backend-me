import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: "./.env"
});


console.log("URI:", process.env.MONGODB_URI);

connectDB()
.then( () => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is running at Port :${process.env.port}`)
    })
})
.catch(() => {
    console.log("MONGO db connection failed !!! ",err)
})





/*
import express from "express"
const app = express()

;(async () =>{
    try{
  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error) => {
            console.log("error",error);
            throw error
        })
        app.listen(process.env.PORT, () => {
            console.log(   `App is listening on Port${
                process.env.PORT
            }`);
        })
    }
    catch(error){
        console.error("ERROR: ",error)
        throw err
    };
    
})
    */