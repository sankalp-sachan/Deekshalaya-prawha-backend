const express = require('express');
const router = express.Router();
const { createComment, getCommentsByNews } = require('../controllers/commentController');
const { auth } = require('../middlewares/auth');

router.get('/:newsId', getCommentsByNews);
router.post('/', auth, createComment);

module.exports = router;
