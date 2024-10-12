import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Runnings 2!");
});

app.get("/users", (req, res) => {
  res.send("User Runnings!");
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} üzerinde çalışıyor.`);
});
