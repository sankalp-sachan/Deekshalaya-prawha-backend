const express = require('express');
const router = express.Router();
const { 
    createNews, getNews, getOneNews, updateNews, deleteNews, 
    getTrendingNews, likeNews 
} = require('../controllers/newsController');
const { auth, authorize } = require('../middlewares/auth');

router.get('/', getNews);
router.get('/trending', getTrendingNews);
router.get('/:slug', getOneNews);
router.post('/', auth, authorize('Admin', 'Journalist'), createNews);
router.put('/:id', auth, authorize('Admin', 'Journalist'), updateNews);
router.delete('/:id', auth, authorize('Admin', 'Journalist'), deleteNews);
router.post('/like/:id', auth, likeNews);

module.exports = router;
