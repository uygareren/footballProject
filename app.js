const express = require("express");
const bodyParser = require("body-parser");
const app = express();

const authRouter = require("./router/Auth"); // Ensure to include the .js extension if necessary
const userRouter = require("./router/User"); // Ensure to include the .js extension if necessary

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);

app.get("/", (req, res) => {
  res.send("Running 1234!");
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} üzerinde çalışıyor.`);
});
