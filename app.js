import express from "express";

const app = express();
const PORT = 5000;

app.get("/", (req, res) => {
  res.send("Runnings!");
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} üzerinde çalışıyor.`);
});
