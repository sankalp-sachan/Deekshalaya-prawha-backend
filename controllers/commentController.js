const Comment = require('../models/Comment');

exports.createComment = async (req, res) => {
    try {
        const { text, newsId } = req.body;
        const comment = new Comment({
            user: req.user.id,
            newsId,
            text
        });
        await comment.save();
        const populatedComment = await Comment.findById(comment._id).populate('user', 'name');
        res.status(201).json(populatedComment);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getCommentsByNews = async (req, res) => {
    try {
        const comments = await Comment.find({ newsId: req.params.newsId })
            .sort({ createdAt: -1 })
            .populate('user', 'name');
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
