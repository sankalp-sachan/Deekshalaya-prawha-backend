const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, authorize } = require('../middlewares/auth');
const { uploadEpaper, getEpapers, streamEpaper } = require('../controllers/epaperController');
require('dotenv').config();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', getEpapers);
router.get('/stream/:fileId', streamEpaper);
router.post('/upload', auth, authorize('Admin'), upload.single('file'), uploadEpaper);

module.exports = router;
