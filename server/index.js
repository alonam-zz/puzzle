import express from  "express";
import multer from  "multer";
import path from "path";
import { fileURLToPath } from "url";
 

import dotenv from 'dotenv';

import  puzzleMeController from "./controllers/puzzlemeContoller.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the parent directory (project root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.SERVER_PORT;

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 7 * 1024 * 1024, // 5 MB
  },
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Node server is working" });
});

app.post("/api/puzzleme", upload.single("file"),(req, res) => {
    puzzleMeController.puzzleMe(req,res);
}); 

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});