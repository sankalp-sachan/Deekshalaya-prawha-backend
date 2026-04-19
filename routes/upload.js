const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, authorize } = require('../middlewares/auth');
const { uploadImages, streamImage } = require('../controllers/uploadController');

const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/', auth, authorize('Admin'), upload.array('images', 5), uploadImages);
router.get('/stream/:fileId', streamImage);

module.exports = router;
