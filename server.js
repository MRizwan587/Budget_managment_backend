import bodyParser from 'body-parser';
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from 'dotenv';
import userRoutes from "./routes/userRoutes.js";
import authroutes from "./routes/authroutes.js";
import transactionRoute from './routes/transactionRoute.js';
import categoryRoutes from './routes/categoryRoutes.js'
import twoFaRoutes from './routes/2faRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.send("Expense management is working!");
});


app.use("/auth", authroutes); 
app.use('/users', userRoutes);
app.use("/categories", categoryRoutes);
app.use('/2fa', twoFaRoutes);
app.use('/', transactionRoute);


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
