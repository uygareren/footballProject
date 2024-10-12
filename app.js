import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Runnings!");
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} üzerinde çalışıyor.`);
});
